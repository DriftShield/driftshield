# DriftShield Backend

Backend API for DriftShield - ML Model Drift Monitoring & Prediction Markets on Solana.

## Features

- 🔐 Wallet-based authentication (Phantom, Solflare)
- 📊 Model monitoring and drift detection
- 🎲 Prediction markets for model performance
- 🛡️ Insurance policies for drift protection
- 💰 USDC-based betting and payouts
- 📡 Real-time WebSocket updates
- 🔔 Multi-channel notifications (Email, SMS, Webhooks)
- 📈 Analytics and leaderboards
- 🔗 Solana blockchain integration

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL + TimescaleDB
- **Cache**: Redis
- **Blockchain**: Solana (via @solana/web3.js)
- **Queue**: Bull (Redis-based)
- **Storage**: Shadow Drive
- **Monitoring**: Winston, Sentry
- **Testing**: Jest

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Solana CLI (for program deployment)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run database migrations
npm run migrate

# Seed database (optional)
npm run seed
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Docker

```bash
# Start all services (PostgreSQL, Redis, API)
npm run docker:up

# Stop all services
npm run docker:down

# View logs
npm run docker:logs
```

## Project Structure

```
backend/
├── src/
│   ├── index.js                 # Entry point
│   ├── config/                  # Configuration files
│   │   ├── database.js
│   │   ├── redis.js
│   │   ├── solana.js
│   │   └── ...
│   ├── db/                      # Database
│   │   ├── migrations/          # Migration scripts
│   │   ├── seeds/               # Seed data
│   │   └── index.js
│   ├── middleware/              # Express middleware
│   │   ├── auth.js
│   │   ├── rateLimiter.js
│   │   ├── validator.js
│   │   └── errorHandler.js
│   ├── routes/                  # API routes
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── models.js
│   │   ├── markets.js
│   │   ├── insurance.js
│   │   └── ...
│   ├── services/                # Business logic
│   │   ├── modelService.js
│   │   ├── marketService.js
│   │   ├── insuranceService.js
│   │   ├── oracleService.js
│   │   ├── walletService.js
│   │   ├── analyticsService.js
│   │   └── notificationService.js
│   ├── jobs/                    # Background jobs
│   │   ├── queues.js
│   │   ├── workers.js
│   │   └── cron.js
│   ├── websocket/               # WebSocket server
│   │   ├── server.js
│   │   └── handlers.js
│   ├── utils/                   # Utilities
│   │   ├── logger.js
│   │   ├── crypto.js
│   │   ├── validation.js
│   │   └── ...
│   └── __tests__/               # Tests
├── logs/                        # Log files
├── docker-compose.yml
├── Dockerfile
├── package.json
└── README.md
```

## API Documentation

API documentation is available at `/api-docs` when running the server.

- Swagger UI: http://localhost:3001/api-docs
- OpenAPI JSON: http://localhost:3001/api-docs.json

## Environment Variables

See `.env.example` for all available configuration options.

## Database Migrations

```bash
# Run all pending migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- users.test.js
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Support

- Documentation: https://docs.driftshield.io
- Discord: https://discord.gg/driftshield
- Email: support@driftshield.io
