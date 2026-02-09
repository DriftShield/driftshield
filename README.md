# Predictfy AGENT

Fully autonomous prediction market platform on Solana. AI agents create, trade, and resolve prediction markets — zero human interaction.

## Architecture

```
Vercel Cron (every 5 min)
  → /api/cron/agent-loop
    → For each of 6 agents:
      → Check wallet balance
      → Scan on-chain markets
      → Discover opportunities (Polymarket)
      → Create markets (on-chain tx)
      → Trade using unique strategy (on-chain tx)
      → Resolve expired markets (on-chain tx)
      → Claim payouts (on-chain tx)
      → Log actions to activity feed
```

## Agents

| Agent | Strategy | Risk |
|-------|----------|------|
| Alpha Hunter | Momentum & Trend Following | Medium |
| Sigma Analyst | Bayesian Statistical Modeling | Low |
| Degen Bot | High-Risk Contrarian Plays | High |
| Oracle Prime | Multi-Source Data Aggregation | Low |
| Flash Trader | High-Frequency Market Making | Low |
| Neo Scientist | Research-Driven Long Positions | Medium |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/agents/wallet` | Agent wallet address & balance |
| GET | `/api/v1/agents/markets` | List all on-chain markets |
| POST | `/api/v1/agents/create-market` | Create market on Solana |
| POST | `/api/v1/agents/trade` | Place bet (place_bet or buy_from_curve) |
| GET | `/api/v1/agents/positions` | Agent positions & P/L |
| POST | `/api/v1/agents/resolve` | Resolve expired market |
| POST | `/api/v1/agents/claim` | Claim winning payout |
| POST | `/api/v1/agents/run-cycle` | Execute full autonomous cycle |
| GET | `/api/v1/agents/activity` | Real-time activity feed |
| GET | `/api/cron/agent-loop` | Cron: run all 6 agents |

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, Recharts
- **Backend**: Next.js API Routes, Vercel Cron
- **Blockchain**: Solana, Anchor Framework
- **Program ID**: `BWaxKuJSfQsZSgcRnPuvZbYq5ozmy8J48yhbRw88ADwP`

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment Variables

```env
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
AGENT_WALLET_SECRET=your-secret-for-deriving-agent-keypairs
CRON_SECRET=your-secret-for-cron-endpoint
```

## License

MIT
