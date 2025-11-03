#!/bin/bash

# DriftShield Programs Build Script
# This script builds all three Solana programs

set -e

echo "🔧 DriftShield Programs Build Script"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "Anchor.toml" ]; then
    echo -e "${RED}❌ Error: Anchor.toml not found. Are you in the right directory?${NC}"
    exit 1
fi

echo "📁 Working directory: $(pwd)"
echo ""

# Step 1: Fix permissions
echo "🔐 Step 1: Fixing cache permissions..."
mkdir -p ~/.cache/solana
chmod -R 755 ~/.cache/solana
echo -e "${GREEN}✓ Permissions fixed${NC}"
echo ""

# Step 2: Clean old build artifacts
echo "🧹 Step 2: Cleaning old build artifacts..."
rm -rf target/deploy/*.so target/idl
rm -f Cargo.lock
echo -e "${GREEN}✓ Cleaned${NC}"
echo ""

# Step 3: Generate lock file
echo "📦 Step 3: Generating Cargo.lock..."
cargo generate-lockfile
echo -e "${GREEN}✓ Lock file generated${NC}"
echo ""

# Step 4: Build with Anchor
echo "🏗️  Step 4: Building programs (this may take 2-3 minutes)..."
echo ""

# Try building with different methods
if anchor build 2>&1 | tee /tmp/anchor-build.log; then
    echo -e "${GREEN}✓ Build successful!${NC}"
else
    echo -e "${YELLOW}⚠️  Anchor build failed, trying alternative method...${NC}"

    # Try building each program separately
    for program in model-registry prediction-market insurance; do
        echo "Building $program..."
        cd "programs/$program"
        if cargo build-sbf 2>&1; then
            echo -e "${GREEN}✓ $program built${NC}"
        else
            echo -e "${RED}❌ $program build failed${NC}"
        fi
        cd ../..
    done
fi

echo ""
echo "📊 Build Results:"
echo "=================="

# Check what was built
if [ -d "target/deploy" ]; then
    echo "Files in target/deploy:"
    ls -lh target/deploy/*.so 2>/dev/null || echo "No .so files found"
    ls -lh target/deploy/*-keypair.json 2>/dev/null || echo "No keypair files found"
else
    echo -e "${RED}❌ target/deploy directory not found${NC}"
fi

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo "1. Check if .so files were created in target/deploy/"
echo "2. If successful, run: anchor deploy"
echo "3. Save the program IDs after deployment"
echo ""

if [ -f "/tmp/anchor-build.log" ]; then
    if grep -q "ERROR" /tmp/anchor-build.log; then
        echo -e "${YELLOW}⚠️  Build log saved to /tmp/anchor-build.log${NC}"
        echo "Last 20 lines of build log:"
        tail -20 /tmp/anchor-build.log
    fi
fi
