#!/bin/bash

# 🚀 Oracle Resolution System - One-Command Deploy
# Run this script to deploy everything automatically

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Oracle Resolution System - Full Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}[1/6] Building Solana Program...${NC}"
cd /Users/ramsis/Downloads/driftshield-program/prediction_bets
cargo build-sbf --manifest-path programs/prediction_bets/Cargo.toml || {
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

echo -e "${BLUE}[2/6] Deploying to Devnet...${NC}"
anchor deploy --provider.cluster devnet || {
    echo -e "${RED}❌ Deploy failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Deployed to devnet${NC}"
echo ""

echo -e "${BLUE}[3/6] Getting Program ID...${NC}"
PROGRAM_ID=$(solana address -k target/deploy/prediction_bets-keypair.json)
echo -e "${YELLOW}Program ID: ${PROGRAM_ID}${NC}"
echo ""

echo -e "${BLUE}[4/6] Uploading IDL to Solscan...${NC}"
anchor idl upgrade $PROGRAM_ID -f target/idl/prediction_bets.json --provider.cluster devnet 2>/dev/null || \
anchor idl init $PROGRAM_ID -f target/idl/prediction_bets.json --provider.cluster devnet || {
    echo -e "${YELLOW}⚠️  IDL upload skipped (might already exist)${NC}"
}
echo -e "${GREEN}✓ IDL on Solscan: https://solscan.io/account/${PROGRAM_ID}?cluster=devnet${NC}"
echo ""

echo -e "${BLUE}[5/6] Copying IDL to UI...${NC}"
cp target/idl/prediction_bets.json /Users/ramsis/Downloads/driftshield-ui/lib/solana/prediction_bets_idl.json
echo -e "${GREEN}✓ IDL copied${NC}"
echo ""

echo -e "${BLUE}[6/6] Updating Program IDs...${NC}"
# Update UI
sed -i.bak "s/new PublicKey(\"[^\"]*\")/new PublicKey(\"$PROGRAM_ID\")/" /Users/ramsis/Downloads/driftshield-ui/lib/solana/prediction-bets.ts

# Update Solana program
sed -i.bak "s/declare_id!(\"[^\"]*\")/declare_id!(\"$PROGRAM_ID\")/" /Users/ramsis/Downloads/driftshield-program/prediction_bets/programs/prediction_bets/src/lib.rs

echo -e "${GREEN}✓ Program IDs updated${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}Program ID:${NC} $PROGRAM_ID"
echo -e "${YELLOW}Solscan:${NC} https://solscan.io/account/${PROGRAM_ID}?cluster=devnet"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. cd /Users/ramsis/Downloads/driftshield-ui"
echo "2. npm run build"
echo "3. npm start"
echo "4. Visit: http://localhost:3000/dashboard/markets"
echo ""
echo -e "${GREEN}🎉 Your oracle resolution system is ready!${NC}"
