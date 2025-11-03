#!/bin/bash

# DriftShield - Local Development Startup Script
# This script sets up and starts both backend and frontend

set -e  # Exit on error

echo "🚀 DriftShield Local Development Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${RED}✗ PostgreSQL not found. Please install PostgreSQL 14+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL $(psql --version | awk '{print $3}')${NC}"

# Check Redis
if ! command -v redis-cli &> /dev/null; then
    echo -e "${RED}✗ Redis not found. Please install Redis 6+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Redis available${NC}"

echo ""

# Check if Redis is running
echo "🔍 Checking if Redis is running..."
if redis-cli ping &> /dev/null; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${YELLOW}⚠ Redis is not running. Starting Redis...${NC}"
    
    # Try to start Redis
    if command -v brew &> /dev/null; then
        brew services start redis || true
    else
        redis-server --daemonize yes || true
    fi
    
    sleep 2
    
    if redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓ Redis started${NC}"
    else
        echo -e "${RED}✗ Could not start Redis. Please start it manually: redis-server${NC}"
        exit 1
    fi
fi

echo ""

# Create database if it doesn't exist
echo "🗄️  Setting up PostgreSQL database..."
if psql -lqt | cut -d \| -f 1 | grep -qw driftshield; then
    echo -e "${GREEN}✓ Database 'driftshield' exists${NC}"
else
    echo -e "${YELLOW}Creating database 'driftshield'...${NC}"
    createdb driftshield || {
        echo -e "${RED}✗ Failed to create database. Try manually: createdb driftshield${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ Database created${NC}"
fi

echo ""

# Set up backend
echo "⚙️  Setting up backend..."
cd backend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating backend .env file..."
    cat > .env << 'EOF'
NODE_ENV=development
PORT=3001
APP_URL=http://localhost:3000
API_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:@localhost:5432/driftshield

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=dev_secret_for_local_testing_only_change_in_production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRY=7d

# Solana
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_COMMITMENT=confirmed

# Development Mode (use mocks)
MOCK_SOLANA=true
MOCK_SHADOW_DRIVE=true

# Feature flags
ENABLE_INSURANCE=true
ENABLE_MARKETS=true
ENABLE_ANALYTICS=true
ENABLE_NOTIFICATIONS=true

# Logging
LOG_LEVEL=info
EOF
    echo -e "${GREEN}✓ Backend .env created${NC}"
else
    echo -e "${GREEN}✓ Backend .env exists${NC}"
fi

# Run migrations
echo "Running database migrations..."
npm run migrate || {
    echo -e "${YELLOW}⚠ Migrations may have already been run${NC}"
}

echo -e "${GREEN}✓ Backend setup complete${NC}"
cd ..

echo ""

# Set up frontend
echo "🎨 Setting up frontend..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "Creating frontend .env.local file..."
    cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
NEXT_PUBLIC_SOLANA_NETWORK=devnet
EOF
    echo -e "${GREEN}✓ Frontend .env.local created${NC}"
else
    echo -e "${GREEN}✓ Frontend .env.local exists${NC}"
fi

echo -e "${GREEN}✓ Frontend setup complete${NC}"

echo ""
echo "========================================" 
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "========================================"
echo ""
echo "To start the application:"
echo ""
echo -e "${BLUE}Terminal 1 - Backend:${NC}"
echo "  cd backend && npm run dev"
echo ""
echo -e "${BLUE}Terminal 2 - Frontend:${NC}"
echo "  npm run dev"
echo ""
echo "Then open: ${BLUE}http://localhost:3000${NC}"
echo ""
echo "Or run this script with --start to auto-start both:"
echo "  ./start-local.sh --start"
echo ""

# If --start flag is provided, start both services
if [ "$1" == "--start" ]; then
    echo "🚀 Starting services..."
    echo ""
    
    # Start backend in background
    echo "Starting backend..."
    cd backend
    npm run dev > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
    cd ..
    
    # Wait a bit for backend to start
    sleep 3
    
    # Start frontend in background
    echo "Starting frontend..."
    npm run dev > logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
    
    echo ""
    echo "========================================" 
    echo -e "${GREEN}🎉 DriftShield is running!${NC}"
    echo "========================================"
    echo ""
    echo "Frontend: ${BLUE}http://localhost:3000${NC}"
    echo "Backend:  ${BLUE}http://localhost:3001${NC}"
    echo "API Docs: ${BLUE}http://localhost:3001/api-docs${NC}"
    echo ""
    echo "Backend logs:  tail -f logs/backend.log"
    echo "Frontend logs: tail -f logs/frontend.log"
    echo ""
    echo "To stop:"
    echo "  kill $BACKEND_PID $FRONTEND_PID"
    echo ""
    echo "Or create stop-local.sh:"
    echo "  echo 'kill $BACKEND_PID $FRONTEND_PID' > stop-local.sh"
    echo "  chmod +x stop-local.sh"
    echo ""
fi

