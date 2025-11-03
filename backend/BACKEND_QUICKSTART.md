# DriftShield Backend - Quick Start Guide

## 🚀 Get Up and Running in 5 Minutes

This guide will help you set up and run the DriftShield backend locally.

---

## Prerequisites

Make sure you have these installed:
- **Node.js 18+** (`node --version`)
- **PostgreSQL 14+** (`psql --version`)
- **Redis 6+** (`redis-cli --version`)

---

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

---

## Step 2: Set Up PostgreSQL Database

```bash
# Create database
createdb driftshield

# Or using psql
psql -U postgres -c "CREATE DATABASE driftshield;"
```

---

## Step 3: Set Up Redis

```bash
# Start Redis (if not running)
redis-server

# Or using Docker
docker run -d -p 6379:6379 redis:latest
```

---

## Step 4: Configure Environment

Create a `.env` file in the `backend/` directory:

```env
# Server
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/driftshield

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_secret_key_change_this_in_production

# Solana (Optional - for testing)
SOLANA_RPC_URL=https://api.devnet.solana.com

# External Services (Optional)
SENDGRID_API_KEY=your_key_here
MIXPANEL_TOKEN=your_token_here
```

> 💡 **Tip:** Generate a secure JWT secret:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## Step 5: Run Database Migrations

```bash
npm run migrate
```

This will create all the necessary tables in your PostgreSQL database.

---

## Step 6: (Optional) Seed Test Data

```bash
npm run seed
```

This will populate your database with sample data for testing.

---

## Step 7: Start the Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

You should see:
```
╔═══════════════════════════════════════════════════════╗
║              DriftShield Backend API                  ║
║  Server running on port 3001                          ║
╚═══════════════════════════════════════════════════════╝
```

---

## Step 8: Test the API

### Check Health
```bash
curl http://localhost:3001/health/detailed
```

### Get API Documentation
```bash
curl http://localhost:3001/api-docs
```

### Test WebSocket Connection
```javascript
// In browser console or Node.js
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onopen = () => {
  console.log('Connected');
  ws.send(JSON.stringify({ type: 'ping' }));
};

ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};
```

---

## 🐳 Alternative: Using Docker

If you prefer Docker:

```bash
# Start all services (PostgreSQL, Redis, Backend)
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

---

## 📋 Available Scripts

```bash
npm start           # Start production server
npm run dev         # Start development server with hot reload
npm run migrate     # Run database migrations
npm run migrate:rollback  # Rollback last migration
npm run seed        # Seed database with test data
npm test            # Run tests
npm run lint        # Lint code
npm run lint:fix    # Fix linting issues
npm run docker:up   # Start Docker containers
npm run docker:down # Stop Docker containers
npm run docker:logs # View Docker logs
```

---

## 🔍 Verify Everything Works

### 1. Database Connection
```bash
curl http://localhost:3001/health/detailed | jq '.services.database'
```

Should return: `{"status": "ok", "latency": ...}`

### 2. Redis Connection
```bash
curl http://localhost:3001/health/detailed | jq '.services.redis'
```

Should return: `{"status": "ok", "latency": ...}`

### 3. API Endpoints
```bash
# Get platform stats
curl http://localhost:3001/api/v1/analytics/platform/stats | jq
```

---

## 🎯 Next Steps

### For Development:

1. **Authentication:**
   - Implement Solana wallet connection in frontend
   - Use `/api/v1/auth/challenge` and `/api/v1/auth/verify` endpoints

2. **Models:**
   - Register a model: POST `/api/v1/models`
   - Get models: GET `/api/v1/models`

3. **Markets:**
   - Create market: POST `/api/v1/markets`
   - Place bet: POST `/api/v1/markets/:marketId/bet`

4. **Real-time Updates:**
   - Connect to WebSocket at `ws://localhost:3001/ws`
   - Subscribe to channels for live updates

### For Production:

1. **Environment Variables:**
   - Set all production environment variables
   - Use strong JWT secret
   - Configure real Solana RPC endpoint
   - Add API keys for external services

2. **Database:**
   - Enable SSL connection
   - Set up database backups
   - Configure connection pooling

3. **Security:**
   - Enable HTTPS
   - Configure CORS properly
   - Set up rate limiting
   - Enable Helmet security headers

4. **Monitoring:**
   - Set up Sentry for error tracking
   - Configure logging aggregation
   - Set up uptime monitoring
   - Enable health check alerts

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 3001
lsof -ti:3001

# Kill process
kill -9 $(lsof -ti:3001)
```

### Database Connection Error
```bash
# Check PostgreSQL is running
pg_isready

# Check connection string
psql $DATABASE_URL
```

### Redis Connection Error
```bash
# Check Redis is running
redis-cli ping

# Should return: PONG
```

### Migration Errors
```bash
# Reset database (WARNING: This deletes all data!)
npm run migrate:rollback
npm run migrate
```

---

## 📚 Documentation

- **API Documentation:** `http://localhost:3001/api-docs`
- **Implementation Summary:** `IMPLEMENTATION_SUMMARY.md`
- **Architecture Plan:** See the complete architecture plan in the project root
- **Database Schema:** `/src/db/migrations/001_initial_schema.sql`

---

## 💡 Tips

1. **Development:** Use `npm run dev` for hot reload during development
2. **Testing:** Test API endpoints using tools like Postman or curl
3. **WebSocket:** Test WebSocket connections using browser DevTools
4. **Logs:** Check logs in `logs/` directory for debugging
5. **Health Checks:** Monitor `/health/detailed` for service status

---

## 🆘 Need Help?

- Check `IMPLEMENTATION_SUMMARY.md` for detailed architecture info
- Review API documentation at `/api-docs`
- Check logs in `logs/` directory
- Run health checks: `curl http://localhost:3001/health/detailed`

---

## ✅ You're All Set!

The DriftShield backend is now running locally. You can:
- ✅ Make API requests to `http://localhost:3001/api/v1/`
- ✅ Connect via WebSocket to `ws://localhost:3001/ws`
- ✅ Monitor health at `http://localhost:3001/health/detailed`
- ✅ View API docs at `http://localhost:3001/api-docs`

Happy coding! 🎉

