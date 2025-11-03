# DriftShield Solana Programs - Deployment Guide

## Overview

Three Solana programs have been created for DriftShield:

1. **Model Registry** - Register AI models and submit monitoring receipts
2. **Prediction Market** - Create markets and trade on model drift predictions
3. **Insurance** - Purchase insurance policies and file claims

## Program Locations

- Model Registry: `/programs/model-registry/src/lib.rs`
- Prediction Market: `/programs/prediction-market/src/lib.rs`
- Insurance: `/programs/insurance/src/lib.rs`

## Building the Programs

### Fix Permission Issue First

There's a permission issue with Solana platform tools. Fix it:

```bash
# Option 1: Fix permissions
sudo chmod -R 755 ~/.cache/solana

# Option 2: Reinstall Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"

# Option 3: Clean build
cd /Users/ramsis/Downloads/driftshield-programs/driftshield-programs
rm -rf target .anchor
```

### Build Commands

```bash
cd /Users/ramsis/Downloads/driftshield-programs/driftshield-programs

# Build all programs
anchor build

# Check build artifacts
ls -la target/deploy/
```

You should see:
- `model_registry.so`
- `prediction_market.so`
- `insurance.so`

## Deploying to Devnet

### Prerequisites

1. Wallet is configured:
```bash
solana config set --url https://api.devnet.solana.com
solana config set --keypair /tmp/devnet-keypair.json
```

2. Check balance (need ~5 SOL for deployment):
```bash
solana balance
# You have: 10 SOL ✓
```

3. If needed, airdrop more:
```bash
solana airdrop 2
```

### Deploy Programs

```bash
cd /Users/ramsis/Downloads/driftshield-programs/driftshield-programs

# Deploy all programs
anchor deploy

# Or deploy individually
solana program deploy target/deploy/model_registry.so
solana program deploy target/deploy/prediction_market.so
solana program deploy target/deploy/insurance.so
```

### Get Program IDs

After deployment:

```bash
# From keypairs
solana-keygen pubkey target/deploy/model_registry-keypair.json
solana-keygen pubkey target/deploy/prediction_market-keypair.json
solana-keygen pubkey target/deploy/insurance-keypair.json
```

## Program IDs (Pre-generated)

These keypairs already exist in `target/deploy/`:

- **Model Registry**: Check `model_registry-keypair.json`
- **Prediction Market**: Check `prediction_market-keypair.json`
- **Insurance**: Check `insurance-keypair.json`

The program IDs in the code need to be updated after first deployment.

## Update Program IDs in Code

After deployment, update the `declare_id!()` macro in each program:

1. `programs/model-registry/src/lib.rs` - Line 3
2. `programs/prediction-market/src/lib.rs` - Line 4
3. `programs/insurance/src/lib.rs` - Line 4

Then rebuild and redeploy:

```bash
anchor build
anchor deploy
```

## Testing Programs

### 1. Register a Model

```typescript
const modelId = "my-model-123";
const tx = await program.methods
  .registerModel(
    modelId,
    "Customer Churn Predictor",
    "Binary Classification",
    "scikit-learn",
    9420 // 94.20% baseline accuracy
  )
  .accounts({
    model: modelPDA,
    owner: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 2. Submit Monitoring Receipt

```typescript
const tx = await program.methods
  .submitMonitoringReceipt(
    9200, // 92.00% accuracy
    9100, // precision
    9000, // recall
    9050, // f1_score
    300,  // 3% drift
    "https://shadow drive.uri/metadata.json"
  )
  .accounts({
    model: modelPDA,
    receipt: receiptPDA,
    owner: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 3. Create Prediction Market

```typescript
const tx = await program.methods
  .createMarket(
    modelPubkey,
    "Will model accuracy stay above 90% for 7 days?",
    Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days from now
    1000000 // 1 USDC minimum stake
  )
  .accounts({
    market: marketPDA,
    creator: wallet.publicKey,
    marketVault: vaultPDA,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 4. Purchase Insurance

```typescript
const tx = await program.methods
  .purchasePolicy(
    modelPubkey,
    5000 * 1e6, // 5000 USDC coverage
    50 * 1e6,   // 50 USDC premium
    9000,       // 90% accuracy threshold
    30          // 30 days duration
  )
  .accounts({
    policy: policyPDA,
    owner: wallet.publicKey,
    userTokenAccount: userUSDC,
    insuranceVault: vaultPDA,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Frontend Integration

After deployment, update these files:

1. Create `driftshield-ui/lib/solana-programs.ts`:

```typescript
export const PROGRAM_IDS = {
  modelRegistry: new PublicKey("YOUR_MODEL_REGISTRY_ID"),
  predictionMarket: new PublicKey("YOUR_PREDICTION_MARKET_ID"),
  insurance: new PublicKey("YOUR_INSURANCE_ID"),
};
```

2. Copy IDL files to frontend:

```bash
cp target/idl/*.json ../driftshield-ui/lib/idl/
```

3. Install Anchor client:

```bash
cd /Users/ramsis/Downloads/driftshield-ui
npm install @coral-xyz/anchor --legacy-peer-deps
```

## Program Features

### Model Registry
- ✅ Register AI models with baseline metrics
- ✅ Submit hourly monitoring receipts
- ✅ Automatic drift detection (>5% accuracy drop)
- ✅ Emit events for drift alerts
- ✅ Track model statistics

### Prediction Market
- ✅ Create YES/NO prediction markets
- ✅ Place bets with USDC
- ✅ Automatic odds calculation (AMM-style)
- ✅ Resolve markets after expiry
- ✅ Claim winnings with pro-rated payouts
- ✅ Position tracking per user

### Insurance
- ✅ Purchase coverage for models
- ✅ File claims when accuracy drops
- ✅ Automatic payout if threshold met
- ✅ Pro-rated refunds on cancellation
- ✅ Time-based expiry

## Security Notes

**⚠️ IMPORTANT - About Your Private Key**

The private key you shared (`3ej67ZNkU...`) is now PUBLIC and should be considered COMPROMISED.

**DO NOT**:
- Use it for mainnet
- Store real funds on it
- Share it anywhere else

**DO**:
- Use it ONLY for this devnet testing
- Generate a new key for production: `solana-keygen new`
- Keep production keys secure and never share them

## Troubleshooting

### Build Issues

1. **Permission denied error**:
```bash
sudo chmod -R 755 ~/.cache/solana
```

2. **Cargo.lock version error**:
```bash
rm Cargo.lock
anchor build
```

3. **Out of memory**:
```bash
export RUST_MIN_STACK=8388608
anchor build
```

### Deployment Issues

1. **Insufficient balance**:
```bash
solana airdrop 2
```

2. **Program already exists**:
```bash
anchor upgrade target/deploy/program.so --program-id <PROGRAM_ID>
```

3. **Transaction too large**:
- Deploy programs one at a time
- Increase compute budget in Anchor.toml

## Next Steps

1. Fix permission issues with Solana toolchain
2. Build programs: `anchor build`
3. Deploy to devnet: `anchor deploy`
4. Note down the three program IDs
5. Update frontend with program IDs
6. Create TypeScript SDK for frontend
7. Test each program function
8. Monitor events with Anchor event listener

## Support

- Anchor Docs: https://www.anchor-lang.com/
- Solana Cookbook: https://solanacookbook.com/
- Solana Stack Exchange: https://solana.stackexchange.com/
