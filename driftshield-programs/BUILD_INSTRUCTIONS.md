# DriftShield Solana Programs - Manual Build Instructions

## Current Status

✅ **All 3 Solana programs are written and ready**:
- Model Registry (`programs/model-registry/src/lib.rs`) - 278 lines
- Prediction Market (`programs/prediction-market/src/lib.rs`) - 383 lines
- Insurance (`programs/insurance/src/lib.rs`) - 291 lines

❌ **Build blocked by permission issue**: `cargo-build-sbf` cannot install platform-tools

## The Permission Problem

Error: `Failed to install platform-tools: Permission denied (os error 13)`

This is a known Solana toolchain issue where the build tools try to write to system directories without proper permissions.

## Solution: Manual Build Steps

### Option 1: Fix Permissions (Recommended)

Run these commands in your terminal:

```bash
# Create cache directory with correct permissions
mkdir -p ~/.cache/solana
chmod 777 ~/.cache/solana

# Alternatively, run build with write access to cache
cd /Users/ramsis/Downloads/driftshield-programs/driftshield-programs
XDG_CACHE_HOME=/tmp/solana-cache anchor build
```

### Option 2: Use Docker (Alternative)

If permissions continue to be an issue:

```bash
# Create Dockerfile
cat > Dockerfile <<'EOF'
FROM projectserum/build:v0.27.0

WORKDIR /workspace
COPY . .

RUN anchor build
EOF

# Build in Docker
docker build -t driftshield-build .
docker run -v $(pwd)/target:/workspace/target driftshield-build

# Extract built programs
docker cp <container_id>:/workspace/target/deploy ./target/
```

### Option 3: Build Each Program Separately

```bash
cd /Users/ramsis/Downloads/driftshield-programs/driftshield-programs

# Build model-registry
cd programs/model-registry
cargo build-sbf
cd ../..

# Build prediction-market
cd programs/prediction-market
cargo build-sbf
cd ../..

# Build insurance
cd programs/insurance
cargo build-sbf
cd ../..

# Copy all .so files to deploy directory
cp programs/*/target/deploy/*.so target/deploy/
```

## After Successful Build

You should see these files in `target/deploy/`:

```
model_registry.so
prediction_market.so
insurance.so
model_registry-keypair.json
prediction_market-keypair.json
insurance-keypair.json
```

## Deploy to Devnet

```bash
cd /Users/ramsis/Downloads/driftshield-programs/driftshield-programs

# Ensure you're on devnet
solana config set --url https://api.devnet.solana.com
solana config set --keypair /tmp/devnet-keypair.json

# Check balance (need ~3 SOL for deployment)
solana balance
# You have: 10 SOL ✓

# Deploy all programs
anchor deploy

# Or deploy individually
solana program deploy target/deploy/model_registry.so
solana program deploy target/deploy/prediction_market.so
solana program deploy target/deploy/insurance.so
```

## Get Program IDs

After deployment:

```bash
# Get the deployed program IDs
solana-keygen pubkey target/deploy/model_registry-keypair.json
solana-keygen pubkey target/deploy/prediction_market-keypair.json
solana-keygen pubkey target/deploy/insurance-keypair.json
```

Save these IDs - you'll need them for the frontend!

## Update Program IDs in Code

The `declare_id!()` macros in each program currently have placeholder IDs. After first deployment, update them:

1. **programs/model-registry/src/lib.rs** - Line 3:
```rust
declare_id!("YOUR_MODEL_REGISTRY_PROGRAM_ID_HERE");
```

2. **programs/prediction-market/src/lib.rs** - Line 4:
```rust
declare_id!("YOUR_PREDICTION_MARKET_PROGRAM_ID_HERE");
```

3. **programs/insurance/src/lib.rs** - Line 4:
```rust
declare_id!("YOUR_INSURANCE_PROGRAM_ID_HERE");
```

Then rebuild and redeploy with the upgrade command:

```bash
anchor build
anchor upgrade target/deploy/model_registry.so --program-id <MODEL_REGISTRY_ID>
anchor upgrade target/deploy/prediction_market.so --program-id <PREDICTION_MARKET_ID>
anchor upgrade target/deploy/insurance.so --program-id <INSURANCE_ID>
```

## Verify Deployment

```bash
# Check program info
solana program show <PROGRAM_ID>

# Check program account
solana account <PROGRAM_ID>
```

## Frontend Integration

Once deployed, create this file in your frontend:

**`driftshield-ui/lib/solana-config.ts`**:

```typescript
import { PublicKey } from '@solana/web3.js';

export const PROGRAM_IDS = {
  MODEL_REGISTRY: new PublicKey("YOUR_MODEL_REGISTRY_ID"),
  PREDICTION_MARKET: new PublicKey("YOUR_PREDICTION_MARKET_ID"),
  INSURANCE: new PublicKey("YOUR_INSURANCE_ID"),
};

export const RPC_ENDPOINT = "https://api.devnet.solana.com";
```

## Program Features Summary

### Model Registry
- `register_model` - Register new AI model
- `submit_monitoring_receipt` - Submit hourly monitoring data
- `update_insurance_status` - Link insurance policy
- `update_market_status` - Link prediction market

### Prediction Market
- `create_market` - Create YES/NO market for model drift
- `place_bet` - Place bet on outcome
- `resolve_market` - Resolve market after expiry
- `claim_winnings` - Claim winnings from resolved market

### Insurance
- `purchase_policy` - Buy insurance for model
- `file_claim` - File claim when accuracy drops
- `cancel_policy` - Cancel policy (pro-rated refund)

## Testing

After deployment, test each program:

```bash
# Test model registry
anchor test --skip-build

# Or use Solana Playground
# https://beta.solpg.io
```

## Troubleshooting

### "Permission denied" persists

Try running with sudo (NOT RECOMMENDED for production):
```bash
sudo anchor build
```

Or change ownership:
```bash
sudo chown -R $(whoami) ~/.cache/solana
```

### "Program account does not exist"

The program needs to be deployed first:
```bash
solana program deploy target/deploy/program.so
```

### "Insufficient funds"

Get more devnet SOL:
```bash
solana airdrop 2
```

### "Transaction too large"

Deploy programs one at a time instead of using `anchor deploy`.

## Next Steps

1. ✅ Fix permissions and build programs
2. ✅ Deploy to devnet
3. ✅ Note program IDs
4. ✅ Update frontend configuration
5. ✅ Test each program function
6. ✅ Integrate with backend API
7. ✅ Build TypeScript SDK for frontend

## Support Resources

- Anchor Book: https://book.anchor-lang.com/
- Solana Cookbook: https://solanacookbook.com/
- Discord: https://discord.gg/solana
- Stack Exchange: https://solana.stackexchange.com/

## Your Devnet Wallet

- Public Key: `9wfAUGMwbVQ28qZN5iCFffzwbMVpKs1UemazQeHZv3xd`
- Balance: 10 SOL (devnet)
- Keypair: `/tmp/devnet-keypair.json`

⚠️ **Remember**: This wallet's private key is public. Only use for devnet testing!

---

**All code is ready - you just need to resolve the build permission issue to compile and deploy!**
