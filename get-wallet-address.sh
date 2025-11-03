#!/bin/bash

echo "🔑 Getting Your Solana Wallet Address"
echo "======================================"
echo ""

# Check if solana CLI is installed
if command -v solana &> /dev/null; then
    echo "✓ Solana CLI found"
    echo ""

    # Get current keypair path
    CONFIG_FILE=~/.config/solana/cli/config.yml
    if [ -f "$CONFIG_FILE" ]; then
        echo "📍 Current configuration:"
        solana config get
        echo ""

        echo "💳 Your wallet address:"
        WALLET_ADDRESS=$(solana address)
        echo ""
        echo "  $WALLET_ADDRESS"
        echo ""

        echo "📋 Copy this address to .env.local:"
        echo ""
        echo "  TREASURY_WALLET=$WALLET_ADDRESS"
        echo ""

        echo "💰 Check your balance:"
        solana balance
        echo ""

        echo "🎁 Need devnet SOL? Run:"
        echo "  solana airdrop 2"
        echo ""
    else
        echo "⚠️  Solana config not found at $CONFIG_FILE"
        echo ""
        echo "Run: solana-keygen new"
        echo "Then: solana config set --url devnet"
    fi
else
    echo "❌ Solana CLI not installed"
    echo ""
    echo "To install Solana CLI:"
    echo "  sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    echo ""
    echo "After installation:"
    echo "  solana-keygen new              # Create wallet"
    echo "  solana config set --url devnet # Set to devnet"
    echo "  solana airdrop 2               # Get test SOL"
    echo ""
    echo "OR use Phantom wallet address:"
    echo "  1. Open Phantom wallet"
    echo "  2. Click your wallet name at top"
    echo "  3. Click 'Copy Address'"
    echo "  4. Paste into .env.local as TREASURY_WALLET"
fi

echo ""
echo "📖 Next steps:"
echo "  1. Copy your wallet address"
echo "  2. Edit .env.local"
echo "  3. Set TREASURY_WALLET=YOUR_ADDRESS"
echo "  4. Restart: npm run dev"
echo "  5. Test: http://localhost:3000/dashboard/x402-demo"
echo ""
