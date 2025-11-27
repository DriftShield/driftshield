use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("APvSf7hDoZDyYgshb4LPm2mpBanbiWgdqJ53TKvKQ7Da");

#[program]
pub mod prediction_market {
    use super::*;

    /// Create a new prediction market with AMM (Constant Product)
    pub fn create_market(
        ctx: Context<CreateMarket>,
        model_pubkey: Pubkey,
        question: String,
        resolution_time: i64,
        min_stake: u64,
        virtual_liquidity: u64,  // NEW: Virtual reserves for AMM
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        require!(
            resolution_time > clock.unix_timestamp,
            ErrorCode::InvalidResolutionTime
        );

        require!(
            virtual_liquidity > 0,
            ErrorCode::InvalidLiquidity
        );

        market.creator = ctx.accounts.creator.key();
        market.model = model_pubkey;
        market.question = question;
        market.yes_pool = 0;
        market.no_pool = 0;
        market.total_volume = 0;
        market.status = MarketStatus::Open;
        market.resolution_time = resolution_time;
        market.resolved_at = 0;
        market.winning_outcome = None;
        market.min_stake = min_stake;
        market.created_at = clock.unix_timestamp;
        market.bump = *ctx.bumps.get("market").unwrap();

        // AMM initialization (Constant Product: x * y = k)
        market.amm_enabled = true;
        market.virtual_yes_reserve = virtual_liquidity;
        market.virtual_no_reserve = virtual_liquidity;
        market.k_constant = virtual_liquidity
            .checked_mul(virtual_liquidity)
            .ok_or(ErrorCode::MathOverflow)?;
        market.total_yes_shares = 0;
        market.total_no_shares = 0;

        emit!(MarketCreated {
            market_key: market.key(),
            creator: market.creator,
            model: model_pubkey,
            question: market.question.clone(),
            virtual_liquidity,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Place a bet on the market with AMM
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        outcome: bool,  // true = YES, false = NO
        amount: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let position = &mut ctx.accounts.position;
        let clock = Clock::get()?;

        require!(
            market.status == MarketStatus::Open,
            ErrorCode::MarketClosed
        );

        require!(
            clock.unix_timestamp < market.resolution_time,
            ErrorCode::MarketExpired
        );

        require!(
            amount >= market.min_stake,
            ErrorCode::StakeTooLow
        );

        // Calculate shares using Constant Product AMM
        let shares = if market.amm_enabled {
            calculate_shares_out(market, outcome, amount)?
        } else {
            // Fallback to 1:1 for P2P markets
            amount
        };

        // Transfer tokens to market vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.market_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Update market pools and reserves
        if outcome {
            market.yes_pool = market.yes_pool.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
            market.total_yes_shares = market.total_yes_shares.checked_add(shares).ok_or(ErrorCode::MathOverflow)?;
        } else {
            market.no_pool = market.no_pool.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
            market.total_no_shares = market.total_no_shares.checked_add(shares).ok_or(ErrorCode::MathOverflow)?;
        }
        market.total_volume = market.total_volume.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;

        // Update user position with shares
        position.market = market.key();
        position.user = ctx.accounts.user.key();
        position.yes_shares = position.yes_shares.checked_add(if outcome { shares } else { 0 })
            .ok_or(ErrorCode::MathOverflow)?;
        position.no_shares = position.no_shares.checked_add(if !outcome { shares } else { 0 })
            .ok_or(ErrorCode::MathOverflow)?;
        position.yes_stake = position.yes_stake.checked_add(if outcome { amount } else { 0 })
            .ok_or(ErrorCode::MathOverflow)?;
        position.no_stake = position.no_stake.checked_add(if !outcome { amount } else { 0 })
            .ok_or(ErrorCode::MathOverflow)?;
        position.total_stake = position.total_stake.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
        position.claimed = false;

        emit!(BetPlaced {
            market_key: market.key(),
            user: ctx.accounts.user.key(),
            outcome,
            amount,
            shares,
            yes_price: get_yes_price(market),
            no_price: get_no_price(market),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Resolve the market (can only be done by oracle/creator after resolution time)
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        outcome: bool,  // true = YES won, false = NO won
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        require!(
            ctx.accounts.authority.key() == market.creator,
            ErrorCode::Unauthorized
        );

        require!(
            market.status == MarketStatus::Open,
            ErrorCode::MarketAlreadyResolved
        );

        require!(
            clock.unix_timestamp >= market.resolution_time,
            ErrorCode::MarketNotExpired
        );

        market.status = MarketStatus::Resolved;
        market.resolved_at = clock.unix_timestamp;
        market.winning_outcome = Some(outcome);

        emit!(MarketResolved {
            market_key: market.key(),
            winning_outcome: outcome,
            yes_pool: market.yes_pool,
            no_pool: market.no_pool,
            total_yes_shares: market.total_yes_shares,
            total_no_shares: market.total_no_shares,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Claim winnings from a resolved market (AMM with shares)
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let market = &ctx.accounts.market;
        let position = &mut ctx.accounts.position;

        require!(
            market.status == MarketStatus::Resolved,
            ErrorCode::MarketNotResolved
        );

        require!(
            position.user == ctx.accounts.user.key(),
            ErrorCode::Unauthorized
        );

        require!(
            !position.claimed,
            ErrorCode::AlreadyClaimed
        );

        let winning_outcome = market.winning_outcome.ok_or(ErrorCode::NoWinningOutcome)?;

        let user_winning_shares = if winning_outcome {
            position.yes_shares
        } else {
            position.no_shares
        };

        require!(user_winning_shares > 0, ErrorCode::NoWinningStake);

        // Calculate payout using shares
        // Payout = (user_shares / total_winning_shares) * total_pool
        let total_pool = market.yes_pool.checked_add(market.no_pool)
            .ok_or(ErrorCode::MathOverflow)?;

        let total_winning_shares = if winning_outcome {
            market.total_yes_shares
        } else {
            market.total_no_shares
        };

        require!(total_winning_shares > 0, ErrorCode::NoWinningStake);

        // Use u128 for intermediate calculation to prevent overflow
        let payout = (user_winning_shares as u128)
            .checked_mul(total_pool as u128)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(total_winning_shares as u128)
            .ok_or(ErrorCode::MathOverflow)? as u64;

        // Transfer winnings from vault to user
        let seeds = &[
            b"market",
            market.creator.as_ref(),
            market.model.as_ref(),
            &[market.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.market_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: market.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, payout)?;

        position.claimed = true;

        emit!(WinningsClaimed {
            market_key: market.key(),
            user: ctx.accounts.user.key(),
            shares: user_winning_shares,
            payout,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Get current market prices (view function - call off-chain)
    pub fn get_prices(ctx: Context<GetPrices>) -> Result<(u64, u64)> {
        let market = &ctx.accounts.market;
        let yes_price = get_yes_price(market);
        let no_price = get_no_price(market);
        Ok((yes_price, no_price))
    }
}

// AMM Helper Functions

/// Calculate shares out using Constant Product AMM (x * y = k)
/// When betting on YES:
/// - Add bet to yes_reserve
/// - Calculate new no_reserve to maintain k
/// - Shares = old_no_reserve - new_no_reserve
fn calculate_shares_out(market: &Market, outcome: bool, bet_amount: u64) -> Result<u64> {
    if outcome {
        // Betting on YES
        let new_yes_reserve = market.virtual_yes_reserve
            .checked_add(bet_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        // k = x * y, so new_y = k / new_x
        let new_no_reserve = (market.k_constant as u128)
            .checked_div(new_yes_reserve as u128)
            .ok_or(ErrorCode::MathOverflow)? as u64;

        let shares = market.virtual_no_reserve
            .checked_sub(new_no_reserve)
            .ok_or(ErrorCode::InsufficientLiquidity)?;

        Ok(shares)
    } else {
        // Betting on NO
        let new_no_reserve = market.virtual_no_reserve
            .checked_add(bet_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        let new_yes_reserve = (market.k_constant as u128)
            .checked_div(new_no_reserve as u128)
            .ok_or(ErrorCode::MathOverflow)? as u64;

        let shares = market.virtual_yes_reserve
            .checked_sub(new_yes_reserve)
            .ok_or(ErrorCode::InsufficientLiquidity)?;

        Ok(shares)
    }
}

/// Get YES price (as basis points, e.g., 5000 = 50%)
fn get_yes_price(market: &Market) -> u64 {
    let total_reserve = market.virtual_yes_reserve
        .saturating_add(market.virtual_no_reserve);

    if total_reserve == 0 {
        return 5000; // 50% default
    }

    // Price = (yes_reserve / total_reserve) * 10000
    ((market.virtual_yes_reserve as u128 * 10000) / total_reserve as u128) as u64
}

/// Get NO price (as basis points)
fn get_no_price(market: &Market) -> u64 {
    let total_reserve = market.virtual_yes_reserve
        .saturating_add(market.virtual_no_reserve);

    if total_reserve == 0 {
        return 5000; // 50% default
    }

    ((market.virtual_no_reserve as u128 * 10000) / total_reserve as u128) as u64
}

// Account Structures

#[account]
pub struct Market {
    pub creator: Pubkey,
    pub model: Pubkey,           // Reference to model in registry
    pub question: String,         // Max 256 chars
    pub yes_pool: u64,           // Total USDC bet on YES
    pub no_pool: u64,            // Total USDC bet on NO
    pub total_volume: u64,
    pub status: MarketStatus,
    pub resolution_time: i64,
    pub resolved_at: i64,
    pub winning_outcome: Option<bool>,
    pub min_stake: u64,
    pub created_at: i64,
    pub bump: u8,

    // AMM fields
    pub amm_enabled: bool,
    pub virtual_yes_reserve: u64,  // Virtual YES tokens for pricing
    pub virtual_no_reserve: u64,   // Virtual NO tokens for pricing
    pub k_constant: u64,           // Constant product (x * y = k)
    pub total_yes_shares: u64,     // Total YES shares issued
    pub total_no_shares: u64,      // Total NO shares issued
}

#[account]
pub struct Position {
    pub market: Pubkey,
    pub user: Pubkey,
    pub yes_stake: u64,      // Total USDC bet on YES
    pub no_stake: u64,       // Total USDC bet on NO
    pub total_stake: u64,
    pub yes_shares: u64,     // YES shares owned
    pub no_shares: u64,      // NO shares owned
    pub claimed: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MarketStatus {
    Open,
    Resolved,
    Cancelled,
}

// Context Structures

#[derive(Accounts)]
#[instruction(model_pubkey: Pubkey)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 32 + 256 + 8 + 8 + 8 + 1 + 8 + 8 + 9 + 8 + 8 + 1 + 1 + 8 + 8 + 8 + 8 + 8 + 200,
        seeds = [b"market", creator.key().as_ref(), model_pubkey.as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub creator: Signer<'info>,
    /// CHECK: Market vault for holding USDC
    pub market_vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 200,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub market_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut, seeds = [b"market", market.creator.as_ref(), market.model.as_ref()], bump)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub position: Account<'info, Position>,
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub market_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct GetPrices<'info> {
    pub market: Account<'info, Market>,
}

// Events

#[event]
pub struct MarketCreated {
    pub market_key: Pubkey,
    pub creator: Pubkey,
    pub model: Pubkey,
    pub question: String,
    pub virtual_liquidity: u64,
    pub timestamp: i64,
}

#[event]
pub struct BetPlaced {
    pub market_key: Pubkey,
    pub user: Pubkey,
    pub outcome: bool,
    pub amount: u64,
    pub shares: u64,
    pub yes_price: u64,  // Basis points (5000 = 50%)
    pub no_price: u64,
    pub timestamp: i64,
}

#[event]
pub struct MarketResolved {
    pub market_key: Pubkey,
    pub winning_outcome: bool,
    pub yes_pool: u64,
    pub no_pool: u64,
    pub total_yes_shares: u64,
    pub total_no_shares: u64,
    pub timestamp: i64,
}

#[event]
pub struct WinningsClaimed {
    pub market_key: Pubkey,
    pub user: Pubkey,
    pub shares: u64,
    pub payout: u64,
    pub timestamp: i64,
}

// Errors

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Market is closed")]
    MarketClosed,
    #[msg("Market has expired")]
    MarketExpired,
    #[msg("Market not resolved yet")]
    MarketNotResolved,
    #[msg("Market already resolved")]
    MarketAlreadyResolved,
    #[msg("Market not expired yet")]
    MarketNotExpired,
    #[msg("Invalid resolution time")]
    InvalidResolutionTime,
    #[msg("Stake amount too low")]
    StakeTooLow,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("No winning outcome set")]
    NoWinningOutcome,
    #[msg("No winning stake in this position")]
    NoWinningStake,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
    #[msg("Invalid liquidity parameter")]
    InvalidLiquidity,
}
