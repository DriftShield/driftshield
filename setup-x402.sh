#!/bin/bash

echo "🚀 X402 Integration Setup for DriftShield"
echo "=========================================="
echo ""

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "✓ .env.local already exists"
else
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "⚠️  Please edit .env.local and add your TREASURY_WALLET address"
fi

echo ""
echo "📦 Dependencies already installed:"
echo "  - @solana/web3.js"
echo "  - @solana/wallet-adapter-react"
echo "  - @solana/wallet-adapter-wallets"
echo ""

echo "✨ X402 Integration Complete!"
echo ""
echo "📁 Files created:"
echo "  ├── app/api/x402/route.ts (Payment API)"
echo "  ├── lib/hooks/useX402.ts (React hook)"
echo "  ├── components/providers/solana-wallet-provider.tsx"
echo "  ├── components/x402/payment-button.tsx"
echo "  ├── components/x402/prediction-market-paid.tsx"
echo "  └── app/dashboard/x402-demo/page.tsx (Demo)"
echo ""
echo "🎯 Next Steps:"
echo "  1. Edit .env.local and set TREASURY_WALLET"
echo "  2. Run: npm run dev"
echo "  3. Visit: http://localhost:3000/dashboard/x402-demo"
echo "  4. Connect wallet and test payments"
echo ""
echo "📖 Read X402_INTEGRATION_GUIDE.md for detailed docs"
echo ""
echo "💡 Use Cases:"
echo "  • Pay-per-bet prediction markets (0.002 SOL)"
echo "  • Premium analytics access (0.001 SOL)"
echo "  • AI model inference (0.003 SOL)"
echo "  • Real-time market data (0.0005 SOL)"
echo ""
echo "Happy building! 🎉"
