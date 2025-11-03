#!/bin/bash

# DriftShield Market Initialization Script
# Initializes Polymarket markets on Solana blockchain

set -e

echo "🎯 DriftShield Market Initialization"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the driftshield-ui directory"
    exit 1
fi

# Parse command line arguments
LIMIT=${1:-20}  # Default to 20 markets
OFFSET=${2:-0}  # Default offset 0

echo "📊 Configuration:"
echo "  - Limit: $LIMIT markets"
echo "  - Offset: $OFFSET"
echo "  - Network: ${NEXT_PUBLIC_SOLANA_NETWORK:-devnet}"
echo ""

# Check Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install it first:"
    echo "   sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

# Check wallet balance
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance 2>/dev/null | awk '{print $1}')
echo "   Balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
    echo "❌ Insufficient balance. You need at least 0.5 SOL"
    echo "   Run: solana airdrop 2"
    exit 1
fi

echo ""
echo "🚀 Starting initialization..."
echo ""

# Run the TypeScript script
npx ts-node -r tsconfig-paths/register scripts/initialize-markets.ts

echo ""
echo "✅ Initialization complete!"
