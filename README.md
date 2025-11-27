# DriftShield

A decentralized prediction markets platform built on Solana, enabling users to bet on real-world events with on-chain transparency, oracle-based resolution, and X402 USDC payments.

## Overview

DriftShield allows users to create and participate in prediction markets for various events. All markets and bets are fully stored on-chain using Solana blockchain, ensuring transparency, security, and immutability. The platform uses the **X402 payment protocol** with USDC for seamless, pay-per-bet transactions.

## Features

### Core Functionality
- **Prediction Markets**: Bet on binary (Yes/No) and multi-outcome markets (2-10 choices)
- **Automated Market Maker (AMM)**: Constant product formula (x × y = k) for instant liquidity
- **Buy & Sell Anytime**: Trade shares before market resolution with dynamic pricing
- **Virtual Liquidity Pools**: Polymarket-style reserves for responsive price discovery
- **Fully On-Chain**: All markets and bets stored on Solana blockchain
- **Multi-Outcome Support**: Create and bet on markets with multiple possible outcomes
- **On-Chain Market Creation**: Admins can create markets directly on-chain
- **Real-Time Updates**: Live market data, odds, and betting activity

### 📈 AMM Trading Features (NEW!)
- **Constant Product AMM**: x × y = k formula for automated pricing
- **Virtual Liquidity**: Configurable reserves (default: 50 SOL equivalent)
- **Dynamic Pricing**: Prices adjust automatically based on buy/sell pressure
- **Price Impact Preview**: See slippage before placing trades
- **Share-Based System**: Buy and sell shares, not 1:1 tokens
- **Instant Settlement**: Buy/sell anytime before market resolution
- **Gain Calculator**: See potential 2x, 5x, 10x, 100x scenarios
- **Low Liquidity Markets**: Polymarket-style responsive pricing (5-15% price swings per bet)
- **On-Chain Position Tracking**: Your shares stored in Position PDA account

### Payment System
- **X402 Protocol**: Standard HTTP 402 payment protocol for micropayments
- **USDC Payments**: Pay $1.00 USDC per bet via PayAI facilitator
- **Fast Verification**: Instant payment verification through facilitator
- **x402scan Integration**: Listed on x402scan.com with UI-invokable endpoints
- **No Gas Fees**: Facilitator sponsors transaction fees

### 📊 Portfolio Management (NEW!)
- **P&L Tracking**: Real-time profit/loss across all positions
- **Position Analytics**: Track open and closed positions with detailed metrics
- **Risk Metrics Dashboard**:
  - Portfolio concentration analysis (Herfindahl Index)
  - Exposure tracking (capital deployment %)
  - Diversification metrics (markets, categories, outcomes)
- **Position Sizing Calculator**: Kelly Criterion-based optimal bet sizing
  - Adjustable win probability estimates
  - 3 risk tolerance levels (Conservative/Moderate/Aggressive)
  - Automatic risk management caps
- **Trade History**: Complete audit trail with CSV export
- **Performance Metrics**: Win rate, ROI, average hold time, max drawdown
- **CSV Export**: Export portfolio data for external analysis

### 🤝 Social Trading (NEW!)
- **Leaderboard**:
  - Rankings by P&L, ROI, win rate, or volume
  - On-chain verified performance (transaction signatures)
  - Trader badges and achievements
  - Filterable by time period (daily/weekly/monthly/all-time)
- **Follow System**:
  - Follow top traders to see their activity
  - Notifications when traders place bets
  - View followers/following counts
- **Copy Trading**:
  - Automatically replicate trades from traders you follow
  - Flexible copy modes: proportional, fixed amount, or percentage
  - Risk controls: max bet size, daily limits, category exclusions
  - Stop-loss protection (auto-disable if trader loses X%)
- **Trader Profiles**:
  - Comprehensive stats (win rate, P&L, ROI, volume, streaks)
  - Verifiable on-chain performance
  - Trading strategies and insights
  - Follower/copier counts
- **Social Feed**:
  - Real-time activity from traders you follow
  - Trade explanations and thesis sharing
  - Engagement metrics (likes, comments, copies)

### Smart Contract Features
- **Oracle Resolution**: Automated market resolution using oracle data feeds
- **Dispute Mechanism**: 48-hour window to dispute oracle resolutions
- **Admin Controls**: Manual resolution for disputed markets
- **Emergency Withdrawal**: Safety mechanism for edge cases (30-day delay)
- **Vault Security**: Secure fund management with PDA (Program Derived Address)

### User Experience
- **Wallet Integration**: Phantom & Solflare wallet support with persistence
- **Market Filters**: Search, sort by volume/date, active/expired filters
- **Analytics Dashboard**: Track betting history, profits, and statistics
- **Leaderboard**: Top performers and platform statistics
- **Settings**: Customizable profile, notifications, and preferences

### Admin Features
- **Market Management**: Create and manage prediction markets
- **Resolution Panel**: Manually resolve disputed markets
- **Analytics**: Platform-wide statistics and insights

## Tech Stack

### Frontend
- **Next.js 15.0**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Solana Web3.js**: Blockchain interaction
- **Anchor Framework**: Solana program integration

### Blockchain
- **Solana**: Layer 1 blockchain (Devnet/Mainnet)
- **Anchor 0.28.0**: Rust framework for Solana programs
- **Program ID**: `48g4cCBG7hnycaruM7GP5hH8Skfc7a43BrqNWpKX53Fh` (with AMM support)

### Payment Protocol
- **X402**: Standard HTTP 402 payment protocol
- **PayAI Facilitator**: `https://facilitator.payai.network`
- **USDC**: Stablecoin payments on Solana
- **x402-next**: Next.js middleware for x402

### Backend (Optional)
- **Node.js + Express**: API server
- **PostgreSQL**: User data and analytics
- **Redis**: Caching and pub/sub
- **Bull**: Job queue for background tasks

### Integrations
- **X402scan**: Payment discovery and UI invocation
- **Shadow Drive**: Decentralized storage (planned)
- **Oracle Networks**: For automated market resolution (planned)

## Getting Started

### Prerequisites
```bash
Node.js >= 18
npm or pnpm
Solana CLI
Anchor CLI (for program development)
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/DriftShield/driftshield.git
cd driftshield-ui
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_RPC_URL=https://api.devnet.solana.com

# X402 Facilitator Configuration
FACILITATOR_URL=https://facilitator.payai.network
ADDRESS=your_solana_wallet_address
TREASURY_WALLET=your_solana_wallet_address

# Optional
NEXT_PUBLIC_API_URL=http://localhost:3001
```

4. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build
```bash
npm run build
npm start
```

## X402 Payment Integration

### How It Works

DriftShield uses the X402 payment protocol for USDC micropayments:

1. User clicks "Place Bet"
2. Middleware returns `402 Payment Required`
3. User pays $1.00 USDC via PayAI facilitator
4. Facilitator verifies payment instantly
5. Bet is authorized and placed on-chain

### Payment Endpoints

- **Discovery**: `GET /api/x402/discovery` - x402scan metadata
- **Place Bet**: `POST /api/x402-bet` - $1.00 USDC per bet
- **Create Market**: `POST /api/x402/create-market` - $5.00 USDC (planned)
- **Analytics**: `GET /api/x402/analytics` - $0.10 USDC (planned)

### x402scan Integration

Your endpoints are listed on [x402scan.com](https://x402scan.com) with:
- ✅ UI-invokable endpoints
- ✅ Schema-driven API documentation
- ✅ Type-safe parameter validation
- ✅ Automatic payment handling

### Testing Payments

```bash
# Get devnet USDC from faucet
# Visit: https://spl-token-faucet.com/

# Test discovery endpoint
curl http://localhost:3000/api/x402/discovery | jq

# Test protected endpoint (returns 402)
curl -X POST http://localhost:3000/api/x402-bet \
  -H "Content-Type: application/json" \
  -d '{"marketId":"test","outcome":"YES","betAmount":10,"userWallet":"YOUR_WALLET"}'
```

## Smart Contract Architecture

### Program Structure
The Solana program (`prediction_bets`) handles all on-chain logic:

#### Accounts
- **Market**: Stores market metadata, AMM reserves, totals, and resolution status
  - `virtual_yes_reserve`, `virtual_no_reserve`: AMM liquidity pools
  - `k_constant`: Constant product (x × y = k)
  - `total_yes_shares`, `total_no_shares`: Total shares issued
- **Position**: User's share holdings for a market (PDA per user per market)
  - `yes_shares`, `no_shares`: Shares owned by user
  - `yes_stake`, `no_stake`: SOL invested in each outcome
- **Vault**: PDA holding all SOL for a market

#### Instructions
1. **create_market**: Create a new prediction market with AMM (supports 2-10 outcomes)
2. **place_bet**: Buy shares using AMM with dynamic pricing
3. **sell_shares**: Sell shares back to AMM pool anytime before resolution
4. **auto_resolve_market**: Oracle-based automatic resolution
5. **dispute_resolution**: Challenge oracle resolution
6. **admin_finalize_resolution**: Manual admin resolution
7. **finalize_oracle_resolution**: Complete undisputed resolution
8. **claim_winnings**: Claim winnings after resolution (based on shares owned)
9. **emergency_withdraw**: Admin emergency fund recovery
10. **get_prices**: View current YES/NO prices from AMM

#### Market Types
- **Binary Markets**: Traditional Yes/No prediction markets
- **Multi-Outcome Markets**: 3-10 possible outcomes (e.g., election winners, tournament results)

#### Resolution Flow
```
Market End → 24h Buffer → Oracle Resolution → 48h Dispute Period → Finalization
                                   ↓
                              (If Disputed)
                                   ↓
                           Admin Manual Resolution
```

## AMM (Automated Market Maker)

DriftShield uses a **Constant Product AMM** similar to Uniswap, adapted for prediction markets.

### How It Works

**Formula**: `x × y = k`
- `x` = Virtual YES reserve
- `y` = Virtual NO reserve
- `k` = Constant product

**Example:**
```
Initial state: 50 YES × 50 NO = 2500 (k)
YES price = 50/(50+50) = 0.50 (50%)

User buys 10 SOL of YES shares:
New YES reserve: 50 + 10 = 60
New NO reserve: 2500 / 60 = 41.67
Shares received: 50 - 41.67 = 8.33 shares
New YES price: 60/(60+41.67) = 0.59 (59%)
```

### Key Features

- **Dynamic Pricing**: Prices automatically adjust based on supply/demand
- **No Counterparty Risk**: Always liquid, instant trades
- **Price Impact**: Larger trades move prices more (slippage)
- **Virtual Liquidity**: Default 50 SOL (adjustable: 10-10000)
- **Share-Based**: You own shares, not tokens
- **Sell Anytime**: Exit positions before market resolves

### Trading Preview

Before placing a trade, users see:
- **SOL Spent/Received**: Amount you're paying or getting back
- **Shares**: How many shares you'll receive/sell
- **Avg Price**: Effective price per share
- **Price Impact**: How much the trade moves the market
- **New Price**: What the market price will be after your trade

### Potential Gains

The UI shows potential profit scenarios:
- **2x gain**: If price doubles from your entry
- **5x gain**: If price reaches 5x your entry
- **10x gain**: If price reaches 10x your entry
- **Max gain**: If your outcome wins (price → $1.00)

### Parameter Recommendations

| Market Size | Virtual Liquidity | Price Impact per 5 SOL bet |
|-------------|-------------------|----------------------------|
| Small       | 20                | 10-20% (very responsive)   |
| Medium      | 50 (default)      | 5-15% (balanced)           |
| Large       | 200               | 2-8% (stable)              |
| Institutional | 1000            | <1% (very stable)          |

## API Routes

### Market Data
- `GET /api/polymarket/markets` - List all markets
- `GET /api/polymarket/markets/[id]` - Get market details

### X402 Protected Endpoints
- `GET /api/x402/discovery` - x402scan discovery metadata
- `POST /api/x402-bet` - Place bet with X402 payment ($1.00 USDC)

### Legacy Endpoints
- `POST /api/bet` - Legacy bet endpoint (deprecated, use x402-bet)
- `GET /api/idl` - Get program IDL

## Project Structure

```
driftshield-ui/
├── app/                      # Next.js app router
│   ├── api/
│   │   ├── bet/             # Legacy bet endpoint
│   │   ├── idl/             # Program IDL
│   │   ├── polymarket/      # Polymarket integration
│   │   ├── x402-bet/        # X402 protected bet endpoint
│   │   └── x402/
│   │       └── discovery/   # X402 discovery for x402scan
│   ├── dashboard/           # Dashboard pages
│   │   ├── markets/         # Markets list and details
│   │   ├── bets/            # User betting history
│   │   ├── analytics/       # Analytics dashboard
│   │   ├── leaderboard/     # Performance leaderboard
│   │   ├── settings/        # User settings
│   │   ├── wallet/          # Wallet management
│   │   ├── profile/         # User profile
│   │   └── admin/           # Admin panel
│   └── page.tsx             # Landing page
├── components/              # React components
│   ├── ui/                  # UI components (shadcn/ui)
│   ├── markets/             # Market components
│   ├── dashboard-nav.tsx    # Navigation
│   └── wallet-button.tsx    # Wallet connection
├── lib/                     # Utilities and helpers
│   ├── solana/              # Solana/Anchor integration
│   ├── polymarket/          # Polymarket API client
│   ├── x402/                # X402 types and helpers
│   ├── amm/                 # AMM (Automated Market Maker) library
│   │   ├── constant-product.ts    # Constant product AMM (x × y = k)
│   │   ├── lmsr.ts               # LMSR AMM (alternative)
│   │   ├── on-chain-integration.ts # Connect AMM to on-chain data
│   │   ├── polymarket-gains.ts   # Gain/loss calculators
│   │   ├── recommended-params.ts # Parameter presets
│   │   └── sell-shares.ts        # Sell functionality helper
│   ├── hooks/               # Custom React hooks
│   │   └── useX402BetSimplified.ts
│   └── types/               # TypeScript types
├── middleware.ts            # X402 payment middleware
├── backend/                 # Optional backend server
├── scripts/                 # Deployment scripts
└── monitoring-agent/        # Market monitoring

Documentation:
├── README.md                  # This file
├── X402_IMPLEMENTATION.md     # X402 implementation details
├── X402_SCAN_INTEGRATION.md   # x402scan integration guide
├── X402_SUMMARY.md            # X402 quick reference
├── POLYMARKET_AMM_PARAMS.md   # AMM parameter configuration guide
└── CLEANUP_SUMMARY.md         # Code cleanup summary
```

## Market Initialization

To initialize markets from Polymarket:

```bash
# Install dependencies
cd scripts
npm install

# Set your Solana keypair path
export SOLANA_KEYPAIR_PATH=~/.config/solana/id.json

# Run initialization script
npx ts-node initialize-markets.ts
```

This will:
1. Fetch active markets from Polymarket
2. Initialize them on-chain with correct end dates
3. Display progress and results

## Admin Setup

To become an admin, add your wallet address to `lib/constants/admin.ts`:

```typescript
const ADMIN_ADDRESSES = [
  'YourWalletAddressHere',
];
```

Admins can:
- Create new markets
- Resolve disputed markets
- Access admin panel at `/dashboard/admin`

## Wallet Integration

### Supported Wallets
- Phantom
- Solflare
- Other Solana-compatible wallets

### Connection Persistence
Wallets stay connected across page refreshes using localStorage.

### Security
- Private keys never leave the wallet
- All transactions require user approval
- No server-side key storage

## Payment Flow

### X402 Integration

**Standard Flow:**
1. User initiates bet
2. Middleware intercepts and returns 402 Payment Required
3. Client pays $1.00 USDC to facilitator
4. Facilitator verifies and co-signs transaction
5. Payment confirmed instantly
6. Bet is placed on-chain

**Benefits:**
- ✅ Instant verification (no blockchain waiting)
- ✅ Replay attack protection (nonce-based)
- ✅ Standard protocol (x402 spec compliant)
- ✅ Can sponsor gas fees (facilitator pays)
- ✅ x402scan discoverable

### Fee Structure
- **X402 Payment**: $1.00 USDC per bet (fixed)
- **Platform Fee**: 2% of winnings (on-chain)
- **Gas Fees**: Sponsored by facilitator (free for users)

## Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Lint Code
```bash
npm run lint
```

### Type Check
```bash
npm run type-check
```

## Deployment

### Vercel (Recommended for Frontend)
1. Connect your GitHub repository
2. Set environment variables:
   - `FACILITATOR_URL`
   - `ADDRESS` (treasury wallet)
   - `NEXT_PUBLIC_SOLANA_RPC_URL`
3. Deploy automatically on push

### Custom Server
```bash
npm run build
npm start
```

### Solana Program Deployment
```bash
cd driftshield-programs/prediction_bets
anchor build
anchor deploy --provider.cluster devnet
anchor idl init --filepath target/idl/prediction_bets.json <program-id>
```

## Environment Variables

### Required
- `NEXT_PUBLIC_SOLANA_NETWORK` - Solana network (devnet/mainnet-beta)
- `NEXT_PUBLIC_SOLANA_RPC_URL` - RPC endpoint
- `SOLANA_RPC_URL` - Server-side RPC endpoint
- `FACILITATOR_URL` - X402 facilitator URL
- `ADDRESS` - Treasury wallet address

### Optional
- `TREASURY_WALLET` - Fallback treasury wallet
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string

## Troubleshooting

### Wallet Not Connecting
- Ensure wallet extension is installed
- Check network matches (Devnet/Mainnet)
- Clear browser cache and localStorage

### Transaction Failing
- Check SOL balance for fees
- Verify market hasn't ended
- Ensure minimum bet amount

### Payment Required Error
- Check user has USDC in wallet
- Verify FACILITATOR_URL is correct
- Ensure middleware is running

### Markets Not Loading
- Check Polymarket API is accessible
- Verify program ID is correct
- Check RPC endpoint is responding

## Documentation

For detailed information, see:
- [X402 Implementation](./X402_IMPLEMENTATION.md) - Technical implementation
- [x402scan Integration](./X402_SCAN_INTEGRATION.md) - Discovery and listing
- [X402 Summary](./X402_SUMMARY.md) - Quick reference
- [AMM Parameters Guide](./POLYMARKET_AMM_PARAMS.md) - Virtual liquidity configuration
- [Cleanup Summary](./CLEANUP_SUMMARY.md) - Code cleanup details

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Security

### Audit Status
The smart contract has not been audited. Use at your own risk on mainnet.

### Reporting Issues
Report security vulnerabilities via GitHub Issues or Twitter DM

### Best Practices
- Never share private keys
- Always verify transaction details
- Use hardware wallets for large amounts
- Test on devnet first

## Roadmap

### Phase 1 (Completed)
- ✅ Core betting functionality
- ✅ Oracle resolution with disputes
- ✅ Admin panel
- ✅ Multi-outcome markets (2-10 outcomes)
- ✅ X402 payment protocol
- ✅ x402scan integration
- ✅ Analytics & leaderboard
- ✅ AMM (Automated Market Maker) with buy/sell functionality
- ✅ Virtual liquidity pools with constant product formula
- ✅ Polymarket-style gain calculations (2x, 5x, 10x scenarios)
- ✅ Portfolio management & social trading

### Phase 2 (In Progress)
- 🔄 Advanced analytics & risk metrics
- 🔄 Enhanced social features & copy trading
- 🔄 User-created markets

### Phase 3 (Planned)
- ⏳ Mobile app
- ⏳ Cross-chain support
- ⏳ Custom facilitator option
- ⏳ Advanced AMM features (LMSR, hybrid models)
- ⏳ Liquidity mining & rewards

## License

MIT License - see LICENSE file for details

## Links

- **Website**: https://www.driftshield.xyz/
- **Twitter**: https://x.com/DriftShield402
- **x402scan**: https://x402scan.com (search for DriftShield)
- **PayAI Docs**: https://docs.payai.network

## Support

For questions and support:
- Twitter: https://x.com/DriftShield402
- GitHub Issues: https://github.com/DriftShield/driftshield/issues
- Documentation: See `/docs` folder

---

Built with ❤️ on Solana • Powered by X402
