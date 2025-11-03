# DriftShield Backend - Quick Start Guide

Get the DriftShield backend up and running in under 10 minutes!

## 🚀 Quick Start (Docker - Recommended)

### Prerequisites
- Docker and Docker Compose installed
- 4GB RAM minimum

### Steps

```bash
# 1. Clone repository
git clone https://github.com/your-org/driftshield-backend.git
cd driftshield-backend

# 2. Create environment file
cp .env.example .env

# 3. Generate secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))" >> .env
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))" >> .env

# 4. Start services
docker-compose up -d

# 5. Check logs
docker-compose logs -f api
```

**That's it!** 🎉

- API: http://localhost:3001
- Database UI (Adminer): http://localhost:8080
- Redis UI: http://localhost:8081

Test the API:
```bash
curl http://localhost:3001/health
```

---

## 💻 Local Development (Without Docker)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Steps

```bash
# 1. Clone repository
git clone https://github.com/your-org/driftshield-backend.git
cd driftshield-backend

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your local database credentials

# 4. Create database
createdb driftshield

# 5. Run migrations
npm run migrate

# 6. (Optional) Seed database with test data
npm run seed

# 7. Start development server
npm run dev
```

The API will be available at http://localhost:3001

---

## 📝 First API Call

### 1. Request Authentication Challenge

```bash
curl -X POST http://localhost:3001/api/v1/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "DemoWallet1234567890123456789012345678"}'
```

Response:
```json
{
  "message": "Sign this message to authenticate with DriftShield...",
  "nonce": "abc123...",
  "timestamp": 1705334400000
}
```

### 2. Sign Message with Wallet
Use your Solana wallet (Phantom, Solflare) to sign the message.

### 3. Verify Signature and Get Token

```bash
curl -X POST http://localhost:3001/api/v1/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "signature": "SIGNED_MESSAGE",
    "message": "MESSAGE_FROM_CHALLENGE"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "walletAddress": "...",
    "username": "user_...",
    "role": "user"
  }
}
```

### 4. Make Authenticated Request

```bash
curl -X GET http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🛠️ Common Commands

```bash
# Start development server
npm run dev

# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Seed database
npm run seed

# Run tests
npm test

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Docker commands
docker-compose up -d          # Start services
docker-compose down           # Stop services
docker-compose logs -f api    # View logs
docker-compose restart api    # Restart API
```

---

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/challenge` - Request challenge
- `POST /api/v1/auth/verify` - Verify signature and login
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout

### Health
- `GET /health` - Health check
- `GET /api-docs` - API documentation

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or change port in .env
PORT=3002
```

### Database Connection Error
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Or locally
pg_isready
```

### Redis Connection Error
```bash
# Check Redis is running
docker-compose ps redis

# Or locally
redis-cli ping
```

### Migration Errors
```bash
# Reset database (⚠️ destroys all data)
dropdb driftshield
createdb driftshield
npm run migrate
npm run seed
```

---

## 📖 Next Steps

1. **Read the Architecture** - See [Architecture Plan](./docs/architecture.md)
2. **API Documentation** - Visit http://localhost:3001/api-docs
3. **Deployment Guide** - See [DEPLOYMENT.md](./DEPLOYMENT.md)
4. **Contributing** - See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 🆘 Need Help?

- **Discord**: https://discord.gg/driftshield
- **Documentation**: https://docs.driftshield.io
- **GitHub Issues**: https://github.com/your-org/driftshield-backend/issues
- **Email**: support@driftshield.io

---

## 📜 License

MIT License - see [LICENSE](./LICENSE) for details
