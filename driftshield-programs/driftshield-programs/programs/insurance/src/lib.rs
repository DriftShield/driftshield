use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("2YbvCZwBSQN9Pe8hmcPDHk2MBCpwHk4tZ11WVuB7LXwC");

#[program]
pub mod insurance {
    use super::*;

    /// Purchase insurance policy for a model
    pub fn purchase_policy(
        ctx: Context<PurchasePolicy>,
        model_pubkey: Pubkey,
        coverage_amount: u64,
        premium: u64,
        accuracy_threshold: u64,  // Basis points
        duration_days: i64,
    ) -> Result<()> {
        let policy = &mut ctx.accounts.policy;
        let clock = Clock::get()?;

        // Transfer premium to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.insurance_vault.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, premium)?;

        policy.owner = ctx.accounts.owner.key();
        policy.model = model_pubkey;
        policy.coverage_amount = coverage_amount;
        policy.premium_paid = premium;
        policy.accuracy_threshold = accuracy_threshold;
        policy.status = PolicyStatus::Active;
        policy.start_time = clock.unix_timestamp;
        policy.expiry_time = clock.unix_timestamp + (duration_days * 86400);
        policy.claim_paid = 0;
        policy.bump = *ctx.bumps.get("policy").unwrap();

        emit!(PolicyPurchased {
            policy_key: policy.key(),
            owner: policy.owner,
            model: model_pubkey,
            coverage_amount,
            premium,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// File a claim on an insurance policy
    pub fn file_claim(
        ctx: Context<FileClaim>,
        current_accuracy: u64,
    ) -> Result<()> {
        let policy = &mut ctx.accounts.policy;
        let clock = Clock::get()?;

        require!(
            ctx.accounts.owner.key() == policy.owner,
            ErrorCode::Unauthorized
        );

        require!(
            policy.status == PolicyStatus::Active,
            ErrorCode::PolicyNotActive
        );

        require!(
            clock.unix_timestamp <= policy.expiry_time,
            ErrorCode::PolicyExpired
        );

        require!(
            current_accuracy < policy.accuracy_threshold,
            ErrorCode::ThresholdNotMet
        );

        // Calculate payout (simplified - could be graduated based on severity)
        let payout = policy.coverage_amount;

        // Transfer payout to owner
        let seeds = &[
            b"policy",
            policy.owner.as_ref(),
            policy.model.as_ref(),
            &[policy.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.insurance_vault.to_account_info(),
            to: ctx.accounts.owner_token_account.to_account_info(),
            authority: policy.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, payout)?;

        policy.status = PolicyStatus::Claimed;
        policy.claim_paid = payout;

        emit!(ClaimPaid {
            policy_key: policy.key(),
            owner: policy.owner,
            payout,
            accuracy_at_claim: current_accuracy,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Cancel an active policy (pro-rated refund)
    pub fn cancel_policy(ctx: Context<CancelPolicy>) -> Result<()> {
        let policy = &mut ctx.accounts.policy;
        let clock = Clock::get()?;

        require!(
            ctx.accounts.owner.key() == policy.owner,
            ErrorCode::Unauthorized
        );

        require!(
            policy.status == PolicyStatus::Active,
            ErrorCode::PolicyNotActive
        );

        // Calculate refund (pro-rated based on time remaining)
        let total_duration = policy.expiry_time - policy.start_time;
        let time_remaining = policy.expiry_time - clock.unix_timestamp;
        let refund = if time_remaining > 0 {
            (policy.premium_paid as u128 * time_remaining as u128 / total_duration as u128) as u64
        } else {
            0
        };

        if refund > 0 {
            let seeds = &[
                b"policy",
                policy.owner.as_ref(),
                policy.model.as_ref(),
                &[policy.bump],
            ];
            let signer = &[&seeds[..]];

            let cpi_accounts = Transfer {
                from: ctx.accounts.insurance_vault.to_account_info(),
                to: ctx.accounts.owner_token_account.to_account_info(),
                authority: policy.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::transfer(cpi_ctx, refund)?;
        }

        policy.status = PolicyStatus::Cancelled;

        emit!(PolicyCancelled {
            policy_key: policy.key(),
            refund_amount: refund,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}

// Account Structures

#[account]
pub struct InsurancePolicy {
    pub owner: Pubkey,
    pub model: Pubkey,
    pub coverage_amount: u64,
    pub premium_paid: u64,
    pub accuracy_threshold: u64,  // Basis points
    pub status: PolicyStatus,
    pub start_time: i64,
    pub expiry_time: i64,
    pub claim_paid: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PolicyStatus {
    Active,
    Claimed,
    Expired,
    Cancelled,
}

// Context Structures

#[derive(Accounts)]
#[instruction(model_pubkey: Pubkey)]
pub struct PurchasePolicy<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 32 + 8 + 8 + 8 + 1 + 8 + 8 + 8 + 1 + 100,
        seeds = [b"policy", owner.key().as_ref(), model_pubkey.as_ref()],
        bump
    )]
    pub policy: Account<'info, InsurancePolicy>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub insurance_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FileClaim<'info> {
    #[account(
        mut,
        seeds = [b"policy", policy.owner.as_ref(), policy.model.as_ref()],
        bump
    )]
    pub policy: Account<'info, InsurancePolicy>,
    pub owner: Signer<'info>,
    #[account(mut)]
    pub owner_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub insurance_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelPolicy<'info> {
    #[account(
        mut,
        seeds = [b"policy", policy.owner.as_ref(), policy.model.as_ref()],
        bump
    )]
    pub policy: Account<'info, InsurancePolicy>,
    pub owner: Signer<'info>,
    #[account(mut)]
    pub owner_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub insurance_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// Events

#[event]
pub struct PolicyPurchased {
    pub policy_key: Pubkey,
    pub owner: Pubkey,
    pub model: Pubkey,
    pub coverage_amount: u64,
    pub premium: u64,
    pub timestamp: i64,
}

#[event]
pub struct ClaimPaid {
    pub policy_key: Pubkey,
    pub owner: Pubkey,
    pub payout: u64,
    pub accuracy_at_claim: u64,
    pub timestamp: i64,
}

#[event]
pub struct PolicyCancelled {
    pub policy_key: Pubkey,
    pub refund_amount: u64,
    pub timestamp: i64,
}

// Errors

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Policy is not active")]
    PolicyNotActive,
    #[msg("Policy has expired")]
    PolicyExpired,
    #[msg("Accuracy threshold not met for claim")]
    ThresholdNotMet,
}
