use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("APvSf7hDoZDyYgshb4LPm2mpBanbiWgdqJ53TKvKQ7Da");

#[program]
pub mod prediction_market {
    use super::*;

    /// Create a new prediction market for model drift
    pub fn create_market(
        ctx: Context<CreateMarket>,
        model_pubkey: Pubkey,
        question: String,
        resolution_time: i64,
        min_stake: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        require!(
            resolution_time > clock.unix_timestamp,
            ErrorCode::InvalidResolutionTime
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

        emit!(MarketCreated {
            market_key: market.key(),
            creator: market.creator,
            model: model_pubkey,
            question: market.question.clone(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Place a bet on the market (YES or NO)
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

        // Transfer tokens to market vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.market_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Update market pools
        if outcome {
            market.yes_pool += amount;
        } else {
            market.no_pool += amount;
        }
        market.total_volume += amount;

        // Update or create position
        position.market = market.key();
        position.user = ctx.accounts.user.key();
        position.yes_stake += if outcome { amount } else { 0 };
        position.no_stake += if !outcome { amount } else { 0 };
        position.total_stake += amount;
        position.claimed = false;

        emit!(BetPlaced {
            market_key: market.key(),
            user: ctx.accounts.user.key(),
            outcome,
            amount,
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
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Claim winnings from a resolved market
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

        let user_winning_stake = if winning_outcome {
            position.yes_stake
        } else {
            position.no_stake
        };

        require!(user_winning_stake > 0, ErrorCode::NoWinningStake);

        // Calculate payout: (user_winning_stake / winning_pool) * total_pool
        let winning_pool = if winning_outcome {
            market.yes_pool
        } else {
            market.no_pool
        };

        let total_pool = market.yes_pool + market.no_pool;
        let payout = (user_winning_stake as u128 * total_pool as u128 / winning_pool as u128) as u64;

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
            payout,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// Account Structures

#[account]
pub struct Market {
    pub creator: Pubkey,
    pub model: Pubkey,           // Reference to model in registry
    pub question: String,         // Max 256 chars
    pub yes_pool: u64,           // Total USDC staked on YES
    pub no_pool: u64,            // Total USDC staked on NO
    pub total_volume: u64,
    pub status: MarketStatus,
    pub resolution_time: i64,
    pub resolved_at: i64,
    pub winning_outcome: Option<bool>,
    pub min_stake: u64,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct Position {
    pub market: Pubkey,
    pub user: Pubkey,
    pub yes_stake: u64,
    pub no_stake: u64,
    pub total_stake: u64,
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
        space = 8 + 32 + 32 + 256 + 8 + 8 + 8 + 1 + 8 + 8 + 9 + 8 + 8 + 1 + 100,
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
        space = 8 + 32 + 32 + 8 + 8 + 8 + 1 + 100,
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

// Events

#[event]
pub struct MarketCreated {
    pub market_key: Pubkey,
    pub creator: Pubkey,
    pub model: Pubkey,
    pub question: String,
    pub timestamp: i64,
}

#[event]
pub struct BetPlaced {
    pub market_key: Pubkey,
    pub user: Pubkey,
    pub outcome: bool,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct MarketResolved {
    pub market_key: Pubkey,
    pub winning_outcome: bool,
    pub yes_pool: u64,
    pub no_pool: u64,
    pub timestamp: i64,
}

#[event]
pub struct WinningsClaimed {
    pub market_key: Pubkey,
    pub user: Pubkey,
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
}
