#!/bin/bash

# Oracle Resolution System - Deployment Script
# This script builds, deploys, and integrates the oracle resolution features

set -e  # Exit on error

echo "🚀 Starting Oracle Resolution System Deployment..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build Solana Program
echo -e "${BLUE}Step 1: Building Solana Program...${NC}"
cd /Users/ramsis/Downloads/driftshield-program/prediction_bets
cargo build-sbf --manifest-path programs/prediction_bets/Cargo.toml

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful!${NC}"
else
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi
echo ""

# Step 2: Deploy to Devnet
echo -e "${BLUE}Step 2: Deploying to Devnet...${NC}"
anchor deploy --provider.cluster devnet

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment successful!${NC}"
else
    echo "❌ Deployment failed. Please check your Solana config."
    exit 1
fi
echo ""

# Step 3: Get Program ID
PROGRAM_ID=$(solana address -k target/deploy/prediction_bets-keypair.json)
echo -e "${YELLOW}Program ID: ${PROGRAM_ID}${NC}"
echo ""

# Step 4: Upload IDL to Solscan
echo -e "${BLUE}Step 4: Uploading IDL to Solscan...${NC}"
anchor idl init ${PROGRAM_ID} -f target/idl/prediction_bets.json --provider.cluster devnet 2>/dev/null || \
anchor idl upgrade ${PROGRAM_ID} -f target/idl/prediction_bets.json --provider.cluster devnet

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ IDL uploaded to Solscan!${NC}"
    echo -e "${YELLOW}View at: https://solscan.io/account/${PROGRAM_ID}?cluster=devnet${NC}"
else
    echo "⚠️  IDL upload failed (might already exist)"
fi
echo ""

# Step 5: Copy IDL to UI Project
echo -e "${BLUE}Step 5: Copying IDL to UI project...${NC}"
cp target/idl/prediction_bets.json /Users/ramsis/Downloads/driftshield-ui/lib/solana/prediction_bets_idl.json
echo -e "${GREEN}✓ IDL copied!${NC}"
echo ""

# Step 6: Update Program ID in UI
echo -e "${BLUE}Step 6: Program ID needs to be updated in:${NC}"
echo "  - lib/solana/prediction-bets.ts"
echo "  - Update PROGRAM_ID constant to: ${PROGRAM_ID}"
echo ""

echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update PROGRAM_ID in lib/solana/prediction-bets.ts"
echo "2. Run the integration script: bash integrate-oracle-ui.sh"
echo "3. Rebuild UI: npm run build"
echo "4. Start server: npm start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
