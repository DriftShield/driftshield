#!/bin/bash

echo "🔍 DriftShield Status Check"
echo "============================"
echo ""

# Check Backend
echo "Backend (http://localhost:3001):"
if curl -s http://localhost:3001/health >/dev/null 2>&1; then
    STATUS=$(curl -s http://localhost:3001/health | jq -r '.status' 2>/dev/null)
    if [ "$STATUS" = "ok" ]; then
        echo "  ✅ Status: $STATUS"
        
        # Get detailed info
        DB_STATUS=$(curl -s http://localhost:3001/health/detailed | jq -r '.services.database.status' 2>/dev/null)
        REDIS_STATUS=$(curl -s http://localhost:3001/health/detailed | jq -r '.services.redis.status' 2>/dev/null)
        
        echo "  ✅ Database: $DB_STATUS"
        echo "  ✅ Redis: $REDIS_STATUS"
        
        # Get API endpoints
        ENDPOINTS=$(curl -s http://localhost:3001/api-docs | jq -r '.endpoints | keys | length' 2>/dev/null)
        echo "  ✅ API Routes: $ENDPOINTS route groups"
    else
        echo "  ⚠️  Status: $STATUS"
    fi
else
    echo "  ❌ Not running"
fi

echo ""

# Check Frontend
echo "Frontend (http://localhost:3000):"
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "  ✅ Running"
else
    echo "  ❌ Not running"
fi

echo ""

# Check WebSocket
echo "WebSocket (ws://localhost:3001/ws):"
if lsof -i:3001 >/dev/null 2>&1; then
    echo "  ✅ Port 3001 listening (WebSocket ready)"
else
    echo "  ❌ Port 3001 not listening"
fi

echo ""
echo "============================"
echo "📊 Quick Stats:"
echo ""

# Database stats
if curl -s http://localhost:3001/health >/dev/null 2>&1; then
    PLATFORM_STATS=$(curl -s http://localhost:3001/api/v1/analytics/platform/stats 2>/dev/null)
    
    if [ -n "$PLATFORM_STATS" ]; then
        USERS=$(echo "$PLATFORM_STATS" | jq -r '.stats.users.total' 2>/dev/null)
        MODELS=$(echo "$PLATFORM_STATS" | jq -r '.stats.models.total' 2>/dev/null)
        MARKETS=$(echo "$PLATFORM_STATS" | jq -r '.stats.markets.total' 2>/dev/null)
        
        echo "  Users: $USERS"
        echo "  Models: $MODELS"
        echo "  Markets: $MARKETS"
    fi
fi

echo ""
echo "🌐 Access URLs:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:3001"
echo "  API Docs:  http://localhost:3001/api-docs"
echo "  Health:    http://localhost:3001/health/detailed"
echo ""
