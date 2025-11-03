use anchor_lang::prelude::*;

declare_id!("34HbFEsYeFa1NrdUyShWXKB36NZ5p4tCjogDbg2p98xm");

#[program]
pub mod model_registry {
    use super::*;

    /// Register a new AI model for monitoring
    pub fn register_model(
        ctx: Context<RegisterModel>,
        model_id: String,
        name: String,
        model_type: String,
        framework: String,
        baseline_accuracy: u64,  // Stored as basis points (9420 = 94.20%)
    ) -> Result<()> {
        let model = &mut ctx.accounts.model;
        let clock = Clock::get()?;

        model.owner = ctx.accounts.owner.key();
        model.model_id = model_id;
        model.name = name;
        model.model_type = model_type;
        model.framework = framework;
        model.baseline_accuracy = baseline_accuracy;
        model.current_accuracy = baseline_accuracy;
        model.total_checks = 0;
        model.drift_alerts = 0;
        model.status = ModelStatus::Active;
        model.created_at = clock.unix_timestamp;
        model.last_check_at = clock.unix_timestamp;
        model.is_insured = false;
        model.has_active_market = false;

        emit!(ModelRegistered {
            model_key: model.key(),
            owner: model.owner,
            model_id: model.model_id.clone(),
            name: model.name.clone(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Submit a monitoring receipt for a model
    pub fn submit_monitoring_receipt(
        ctx: Context<SubmitReceipt>,
        accuracy: u64,
        precision: u64,
        recall: u64,
        f1_score: u64,
        drift_score: u64,  // 0-10000 basis points
        metadata_uri: String,
    ) -> Result<()> {
        let model = &mut ctx.accounts.model;
        let receipt = &mut ctx.accounts.receipt;
        let clock = Clock::get()?;

        require!(
            ctx.accounts.owner.key() == model.owner,
            ErrorCode::Unauthorized
        );

        // Update receipt
        receipt.model = model.key();
        receipt.checker = ctx.accounts.owner.key();
        receipt.accuracy = accuracy;
        receipt.precision = precision;
        receipt.recall = recall;
        receipt.f1_score = f1_score;
        receipt.drift_score = drift_score;
        receipt.metadata_uri = metadata_uri;
        receipt.timestamp = clock.unix_timestamp;

        // Update model stats
        model.current_accuracy = accuracy;
        model.total_checks += 1;
        model.last_check_at = clock.unix_timestamp;

        // Check for drift alert (>5% accuracy drop from baseline)
        let accuracy_drop = if model.baseline_accuracy > accuracy {
            model.baseline_accuracy - accuracy
        } else {
            0
        };

        if accuracy_drop > 500 {  // 5% = 500 basis points
            model.drift_alerts += 1;
            model.status = ModelStatus::DriftDetected;

            emit!(DriftAlert {
                model_key: model.key(),
                accuracy_drop,
                current_accuracy: accuracy,
                timestamp: clock.unix_timestamp,
            });
        }

        emit!(ReceiptSubmitted {
            model_key: model.key(),
            receipt_key: receipt.key(),
            accuracy,
            drift_score,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Update model insurance status
    pub fn update_insurance_status(
        ctx: Context<UpdateInsuranceStatus>,
        is_insured: bool,
    ) -> Result<()> {
        let model = &mut ctx.accounts.model;

        require!(
            ctx.accounts.owner.key() == model.owner ||
            ctx.accounts.owner.key() == ctx.accounts.insurance_program.key(),
            ErrorCode::Unauthorized
        );

        model.is_insured = is_insured;

        Ok(())
    }

    /// Update model market status
    pub fn update_market_status(
        ctx: Context<UpdateMarketStatus>,
        has_active_market: bool,
    ) -> Result<()> {
        let model = &mut ctx.accounts.model;

        require!(
            ctx.accounts.owner.key() == model.owner ||
            ctx.accounts.owner.key() == ctx.accounts.market_program.key(),
            ErrorCode::Unauthorized
        );

        model.has_active_market = has_active_market;

        Ok(())
    }
}

// Account Structures

#[account]
pub struct ModelAccount {
    pub owner: Pubkey,
    pub model_id: String,          // Max 64 chars
    pub name: String,              // Max 128 chars
    pub model_type: String,        // Max 64 chars
    pub framework: String,         // Max 64 chars
    pub baseline_accuracy: u64,    // Basis points
    pub current_accuracy: u64,     // Basis points
    pub total_checks: u64,
    pub drift_alerts: u64,
    pub status: ModelStatus,
    pub created_at: i64,
    pub last_check_at: i64,
    pub is_insured: bool,
    pub has_active_market: bool,
}

#[account]
pub struct MonitoringReceipt {
    pub model: Pubkey,
    pub checker: Pubkey,
    pub accuracy: u64,
    pub precision: u64,
    pub recall: u64,
    pub f1_score: u64,
    pub drift_score: u64,
    pub metadata_uri: String,      // Shadow Drive URI
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ModelStatus {
    Active,
    DriftDetected,
    Paused,
}

// Context Structures

#[derive(Accounts)]
#[instruction(model_id: String)]
pub struct RegisterModel<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 64 + 128 + 64 + 64 + 8 + 8 + 8 + 8 + 1 + 8 + 8 + 1 + 1 + 100, // Add padding
        seeds = [b"model", owner.key().as_ref(), model_id.as_bytes()],
        bump
    )]
    pub model: Account<'info, ModelAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitReceipt<'info> {
    #[account(mut)]
    pub model: Account<'info, ModelAccount>,
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 256 + 8 + 100,
    )]
    pub receipt: Account<'info, MonitoringReceipt>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateInsuranceStatus<'info> {
    #[account(mut)]
    pub model: Account<'info, ModelAccount>,
    pub owner: Signer<'info>,
    /// CHECK: This is the insurance program ID
    pub insurance_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpdateMarketStatus<'info> {
    #[account(mut)]
    pub model: Account<'info, ModelAccount>,
    pub owner: Signer<'info>,
    /// CHECK: This is the market program ID
    pub market_program: AccountInfo<'info>,
}

// Events

#[event]
pub struct ModelRegistered {
    pub model_key: Pubkey,
    pub owner: Pubkey,
    pub model_id: String,
    pub name: String,
    pub timestamp: i64,
}

#[event]
pub struct ReceiptSubmitted {
    pub model_key: Pubkey,
    pub receipt_key: Pubkey,
    pub accuracy: u64,
    pub drift_score: u64,
    pub timestamp: i64,
}

#[event]
pub struct DriftAlert {
    pub model_key: Pubkey,
    pub accuracy_drop: u64,
    pub current_accuracy: u64,
    pub timestamp: i64,
}

// Errors

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid model status")]
    InvalidStatus,
    #[msg("Model ID too long")]
    ModelIdTooLong,
}
