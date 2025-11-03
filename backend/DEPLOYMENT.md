# DriftShield Backend - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Production Deployment](#production-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Required Software
- Node.js 18+ and npm
- PostgreSQL 14+ with TimescaleDB extension
- Redis 6+
- Docker & Docker Compose (for containerized deployment)
- Solana CLI (for program deployment)

### Required Accounts
- Solana wallet with SOL for transactions
- SendGrid account (for email notifications)
- Twilio account (optional, for SMS)
- Mixpanel account (optional, for analytics)
- Sentry account (optional, for error tracking)

---

## Local Development

### 1. Clone Repository
```bash
git clone https://github.com/your-org/driftshield-backend.git
cd driftshield-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
nano .env
```

### 4. Start Database Services
```bash
# Option A: Using Docker
docker-compose up -d postgres redis

# Option B: Using local installations
# Ensure PostgreSQL and Redis are running
```

### 5. Run Database Migrations
```bash
npm run migrate
```

### 6. Seed Database (Optional)
```bash
npm run seed
```

### 7. Start Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

---

## Docker Deployment

### Full Stack with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Remove volumes (⚠️ destroys data)
docker-compose down -v
```

### Services Included
- **postgres**: TimescaleDB database (port 5432)
- **redis**: Redis cache (port 6379)
- **api**: Backend API (port 3001)
- **adminer**: Database management UI (port 8080)
- **redis-commander**: Redis management UI (port 8081)

### Access Management Tools
- Adminer: http://localhost:8080
- Redis Commander: http://localhost:8081

---

## Production Deployment

### Option 1: Docker (Recommended)

#### 1. Build Production Image
```bash
docker build -t driftshield-api:latest --target production .
```

#### 2. Run with Docker Compose
```bash
# Set production environment variables
export NODE_ENV=production
export JWT_SECRET=your-secret-key
export DATABASE_URL=your-db-url

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

#### 3. Enable Auto-restart
```bash
docker update --restart=unless-stopped driftshield-api
```

---

### Option 2: DigitalOcean (Droplet)

#### 1. Create Droplet
- OS: Ubuntu 22.04 LTS
- Size: 4GB RAM / 2 vCPUs (minimum)
- Enable monitoring

#### 2. SSH and Setup
```bash
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PostgreSQL with TimescaleDB
apt install -y postgresql postgresql-contrib
sh -c "echo 'deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $(lsb_release -c -s) main' > /etc/apt/sources.list.d/timescaledb.list"
wget --quiet -O - https://packagecloud.io/timescale/timescaledb/gpgkey | apt-key add -
apt update && apt install -y timescaledb-2-postgresql-14

# Install Redis
apt install -y redis-server

# Install Docker (optional)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

#### 3. Configure Firewall
```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

#### 4. Clone and Deploy
```bash
# Create app user
adduser driftshield
usermod -aG sudo driftshield
su - driftshield

# Clone repository
git clone https://github.com/your-org/driftshield-backend.git
cd driftshield-backend

# Install dependencies
npm ci --only=production

# Configure environment
cp .env.example .env
nano .env

# Run migrations
npm run migrate

# Start with PM2
npm install -g pm2
pm2 start src/index.js --name driftshield-api
pm2 startup
pm2 save
```

---

### Option 3: AWS ECS/Fargate

#### 1. Create ECR Repository
```bash
aws ecr create-repository --repository-name driftshield-api
```

#### 2. Build and Push Image
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# Build
docker build -t driftshield-api:latest --target production .

# Tag
docker tag driftshield-api:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/driftshield-api:latest

# Push
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/driftshield-api:latest
```

#### 3. Create ECS Task Definition
See `infrastructure/aws/task-definition.json`

#### 4. Deploy to Fargate
```bash
aws ecs create-service \
  --cluster driftshield \
  --service-name api \
  --task-definition driftshield-api \
  --desired-count 2 \
  --launch-type FARGATE
```

---

## Environment Configuration

### Critical Variables

```bash
# Application
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@host:5432/driftshield

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Security
JWT_SECRET=generate-strong-secret-key

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta
MODEL_REGISTRY_PROGRAM_ID=your-program-id
DRIFT_MARKET_PROGRAM_ID=your-program-id
```

### Generate Secure Keys
```bash
# JWT Secret (256-bit)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key (256-bit)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Setup

### Create Database
```bash
sudo -u postgres psql

CREATE DATABASE driftshield;
CREATE USER driftshield_user WITH ENCRYPTED PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE driftshield TO driftshield_user;

\c driftshield
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Run Migrations
```bash
npm run migrate
```

### Backup Database
```bash
# Manual backup
pg_dump -h localhost -U postgres driftshield > backup_$(date +%Y%m%d).sql

# Automated backup (cron)
crontab -e
# Add: 0 2 * * * pg_dump -h localhost -U postgres driftshield > /backups/backup_$(date +\%Y\%m\%d).sql
```

### Restore Database
```bash
psql -h localhost -U postgres driftshield < backup_20250115.sql
```

---

## Monitoring & Maintenance

### Health Checks
```bash
# API health
curl http://localhost:3001/health

# Database connection
psql -h localhost -U postgres -c "SELECT 1"

# Redis connection
redis-cli ping
```

### Logs
```bash
# View API logs
pm2 logs driftshield-api

# Or with Docker
docker logs -f driftshield-api

# Application logs
tail -f logs/app.log
tail -f logs/error.log
```

### Performance Monitoring
```bash
# CPU & Memory
pm2 monit

# Database performance
psql -h localhost -U postgres driftshield -c "
  SELECT query, calls, total_time, mean_time
  FROM pg_stat_statements
  ORDER BY total_time DESC
  LIMIT 10;
"
```

### Restart Services
```bash
# PM2
pm2 restart driftshield-api

# Docker
docker-compose restart api

# System service (if configured)
systemctl restart driftshield-api
```

---

## SSL/TLS Setup

### Using Certbot (Let's Encrypt)
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d api.driftshield.io

# Auto-renewal
certbot renew --dry-run
```

---

## Scaling

### Horizontal Scaling
```bash
# PM2 cluster mode
pm2 start src/index.js -i max --name driftshield-api

# Docker Compose
docker-compose up -d --scale api=3
```

### Load Balancer
- Use Nginx or AWS ALB
- Configure health checks: `/health`
- Enable sticky sessions for WebSocket

---

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Check connection
psql -h localhost -U postgres -c "SELECT 1"
```

### Redis Connection Issues
```bash
# Check Redis is running
systemctl status redis

# Test connection
redis-cli ping
```

### High Memory Usage
```bash
# Clear Redis cache
redis-cli FLUSHDB

# Restart API
pm2 restart driftshield-api
```

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secret (256-bit)
- [ ] Enable firewall (UFW/iptables)
- [ ] Configure SSL/TLS certificates
- [ ] Set up database backups
- [ ] Enable fail2ban for SSH
- [ ] Configure rate limiting
- [ ] Set up monitoring alerts
- [ ] Review and update dependencies regularly
- [ ] Enable audit logging

---

## Support

- Documentation: https://docs.driftshield.io
- Discord: https://discord.gg/driftshield
- Email: support@driftshield.io
