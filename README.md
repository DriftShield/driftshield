# DriftShield

A decentralized prediction markets platform built on Solana, enabling users to bet on real-world events with on-chain transparency and oracle-based resolution.

## Overview

DriftShield allows users to create and participate in prediction markets for various events. All bets are stored on-chain using Solana blockchain, ensuring transparency, security, and immutability. The platform integrates with Polymarket for market data and uses X402 for seamless payments.

## Features

### Core Functionality
- **Prediction Markets**: Bet on binary (Yes/No) and multi-outcome markets (2-10 choices)
- **200+ Markets**: Integration with Polymarket API for diverse betting options
- **Multi-Outcome Support**: Create and bet on markets with multiple possible outcomes
- **On-Chain Storage**: All bets and market data stored on Solana blockchain
- **Real-Time Updates**: Live market data, odds, and betting activity

### Smart Contract Features
- **Oracle Resolution**: Automated market resolution using oracle data feeds
- **Dispute Mechanism**: 48-hour window to dispute oracle resolutions
- **Admin Controls**: Manual resolution for disputed markets
- **Emergency Withdrawal**: Safety mechanism for edge cases (30-day delay)
- **Vault Security**: Secure fund management with PDA (Program Derived Address)

### User Experience
- **Wallet Integration**: Phantom & Solflare wallet support with persistence
- **X402 Payments**: Fast, gasless payments for betting
- **Market Filters**: Search, sort by volume/date, active/expired filters
- **Analytics Dashboard**: Track betting history, profits, and statistics
- **Settings**: Customizable profile, notifications, and preferences

### Admin Features
- **Market Management**: Create and manage prediction markets
- **Resolution Panel**: Manually resolve disputed markets
- **Analytics**: Platform-wide statistics and insights

## Tech Stack

### Frontend
- **Next.js 16.0.0**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Solana Web3.js**: Blockchain interaction
- **Anchor Framework**: Solana program integration

### Blockchain
- **Solana**: Layer 1 blockchain (Devnet)
- **Anchor 0.31.1**: Rust framework for Solana programs
- **Program ID**: `BQtqZ6H72cbMjmSzm6Bv5zKYBF9a6ZwCnbZJNYWNK1xj`

### Backend (Optional)
- **Node.js + Express**: API server
- **PostgreSQL**: User data and analytics
- **Redis**: Caching and pub/sub
- **Bull**: Job queue for background tasks

### Integrations
- **Polymarket API**: Market data and events
- **X402**: Payment processing
- **Shadow Drive**: Decentralized storage (planned)

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
cd driftshield
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
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=BQtqZ6H72cbMjmSzm6Bv5zKYBF9a6ZwCnbZJNYWNK1xj
NEXT_PUBLIC_X402_API_KEY=your_x402_api_key
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

## Smart Contract Architecture

### Program Structure
The Solana program (`prediction_bets`) handles all on-chain logic:

#### Accounts
- **Market**: Stores market metadata, totals, and resolution status
- **Bet**: Individual user bets with amount and outcome
- **Vault**: PDA holding all funds for a market

#### Instructions
1. **initialize_market**: Create a new prediction market (supports 2-10 outcomes)
2. **place_bet**: Place a bet on any outcome (by index)
3. **auto_resolve_market**: Oracle-based automatic resolution
4. **dispute_resolution**: Challenge oracle resolution
5. **admin_finalize_resolution**: Manual admin resolution
6. **finalize_oracle_resolution**: Complete undisputed resolution
7. **claim_payout**: Claim winnings after resolution
8. **emergency_withdraw**: Admin emergency fund recovery

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

## API Routes

### Market Data
- `GET /api/polymarket/markets` - List all markets
- `GET /api/polymarket/markets/[id]` - Get market details

### Betting
- `POST /api/bet` - Place a bet and verify payment
- `GET /api/idl` - Get program IDL

### Payments
- `POST /api/x402` - Process X402 payment

## Project Structure

```
driftshield/
├── app/                      # Next.js app router pages
│   ├── api/                 # API routes
│   ├── dashboard/           # Dashboard pages
│   │   ├── markets/         # Markets list and details
│   │   ├── bets/            # User betting history
│   │   ├── analytics/       # Analytics dashboard
│   │   ├── settings/        # User settings
│   │   └── admin/           # Admin panel
│   └── page.tsx             # Landing page
├── components/              # React components
│   ├── ui/                  # UI components
│   ├── dashboard-nav.tsx    # Navigation
│   ├── wallet-button.tsx    # Wallet connection
│   └── x402/                # Payment components
├── lib/                     # Utilities and helpers
│   ├── solana/              # Solana/Anchor integration
│   ├── polymarket/          # Polymarket API client
│   └── hooks/               # Custom React hooks
├── backend/                 # Optional backend server
├── scripts/                 # Deployment and utility scripts
└── monitoring-agent/        # Market monitoring service
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

### Connection Persistence
Wallets stay connected across page refreshes using localStorage.

### Security
- Private keys never leave the wallet
- All transactions require user approval
- No server-side key storage

## Payment Flow

### X402 Integration
1. User initiates bet
2. X402 payment request created
3. User approves payment in wallet
4. Backend verifies payment on-chain
5. Bet is recorded and confirmed

### Fee Structure
- Platform fee: 2% of winnings
- X402 transaction fee: ~0.000005 SOL

## Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Run Tests
```bash
npm test
```

### Lint Code
```bash
npm run lint
```

## Deployment

### Vercel (Recommended for Frontend)
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Custom Server
```bash
npm run build
npm start
```

### Solana Program Deployment
```bash
cd driftshield-program/prediction_bets
anchor build
anchor deploy --provider.cluster devnet
anchor idl init --filepath target/idl/prediction_bets.json <program-id>
```

## Environment Variables

### Required
- `NEXT_PUBLIC_SOLANA_NETWORK` - Solana network (devnet/mainnet-beta)
- `NEXT_PUBLIC_SOLANA_RPC_URL` - RPC endpoint
- `NEXT_PUBLIC_PROGRAM_ID` - Deployed program ID

### Optional
- `NEXT_PUBLIC_X402_API_KEY` - X402 API key
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
- Ensure minimum bet amount (0.01 SOL)

### Markets Not Loading
- Check Polymarket API is accessible
- Verify program ID is correct
- Check RPC endpoint is responding

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
- ✅ Oracle resolution
- ✅ Dispute mechanism
- ✅ Admin panel
- ✅ Multi-outcome markets (2-10 outcomes)

### Phase 2 (In Progress)
- 🔄 Liquidity pools (AMM-style)
- 🔄 Social features (leaderboards, profiles)

### Phase 3 (Planned)
- ⏳ Mobile app
- ⏳ Advanced analytics
- ⏳ Market creation by users
- ⏳ Cross-chain support

## License

MIT License - see LICENSE file for details

## Links

- **Website**: https://www.driftshield.xyz/
- **Twitter**: https://x.com/DriftShield402

## Support

For questions and support:
- Twitter: https://x.com/DriftShield402
- GitHub Issues: https://github.com/DriftShield/driftshield/issues

---

Built with ❤️ on Solana
