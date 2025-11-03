#!/bin/bash

echo "🔧 Fixing Solana Build Permissions..."
echo ""

# Fix ownership of Solana cache directories
echo "Fixing ~/.cache/solana ownership..."
sudo chown -R $(whoami):staff ~/.cache/solana

# Fix if local share exists
if [ -d ~/.local/share/solana ]; then
    echo "Fixing ~/.local/share/solana ownership..."
    sudo chown -R $(whoami):staff ~/.local/share/solana
fi

echo ""
echo "✅ Permissions fixed!"
echo ""
echo "Now run the deployment:"
echo "bash /Users/ramsis/Downloads/driftshield-ui/ORACLE_QUICK_START.sh"
