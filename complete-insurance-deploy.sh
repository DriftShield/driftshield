#!/bin/bash

# Recover the buffer keypair
echo "comic huge swing test kangaroo action charge shield snake umbrella island ivory" | \
  solana-keygen recover -o /tmp/insurance-buffer.json --force

# Resume the deployment
solana program deploy target/deploy/insurance.so \
  --program-id 2YbvCZwBSQN9Pe8hmcPDHk2MBCpwHk4tZ11WVuB7LXwC \
  --buffer /tmp/insurance-buffer.json \
  --url devnet

echo "✅ Insurance program upgraded!"

# Deploy prediction market
echo "Deploying prediction market..."
solana program deploy target/deploy/prediction_market.so \
  --program-id APvSf7hDoZDyYgshb4LPm2mpBanbiWgdqJ53TKvKQ7Da \
  --url devnet

echo "✅ Prediction market program upgraded!"
echo ""
echo "🎉 All programs are now upgraded and ready to use!"
echo "Visit http://localhost:3000/programs to test!"
