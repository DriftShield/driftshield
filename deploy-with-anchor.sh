#!/bin/bash

echo "🚀 Deploying with Anchor Build (Workaround)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /Users/ramsis/Downloads/driftshield-program/prediction_bets

# Use anchor build instead of cargo build-sbf
echo "[1/6] Building with Anchor..."
anchor build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful!"
echo ""

echo "[2/6] Deploying to devnet..."
anchor deploy --provider.cluster devnet

if [ $? -ne 0 ]; then
    echo "❌ Deploy failed"
    exit 1
fi

echo "✅ Deployed!"
echo ""

echo "[3/6] Getting Program ID..."
PROGRAM_ID=$(solana address -k target/deploy/prediction_bets-keypair.json)
echo "Program ID: $PROGRAM_ID"
echo ""

echo "[4/6] Uploading IDL..."
anchor idl upgrade $PROGRAM_ID -f target/idl/prediction_bets.json --provider.cluster devnet 2>/dev/null || \
anchor idl init $PROGRAM_ID -f target/idl/prediction_bets.json --provider.cluster devnet

echo "✅ IDL uploaded!"
echo ""

echo "[5/6] Copying IDL to UI..."
cp target/idl/prediction_bets.json /Users/ramsis/Downloads/driftshield-ui/lib/solana/prediction_bets_idl.json

echo "✅ IDL copied!"
echo ""

echo "[6/6] Updating Program IDs..."
# Update UI
sed -i.bak "s/new PublicKey(\"[^\"]*\")/new PublicKey(\"$PROGRAM_ID\")/" /Users/ramsis/Downloads/driftshield-ui/lib/solana/prediction-bets.ts

# Update Solana program
sed -i.bak "s/declare_id!(\"[^\"]*\")/declare_id!(\"$PROGRAM_ID\")/" /Users/ramsis/Downloads/driftshield-program/prediction_bets/programs/prediction_bets/src/lib.rs

echo "✅ Program IDs updated!"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Program ID: $PROGRAM_ID"
echo "Solscan: https://solscan.io/account/${PROGRAM_ID}?cluster=devnet"
echo ""
echo "Next: Rebuild UI"
echo "  cd /Users/ramsis/Downloads/driftshield-ui"
echo "  npm run build && npm start"
