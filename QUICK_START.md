# 🚀 Quick Start - Deploy to Vercel (5 Minutes)

## What You Need
- ✅ GitHub account
- ✅ Vercel account (free - sign up with GitHub)
- ✅ This repo pushed to GitHub

---

## Step-by-Step Deploy

### 1. Click Deploy Button

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/DriftShield/driftshield)

**OR** go to: https://vercel.com/new

---

### 2. Import Your Repository

1. Sign in with GitHub
2. Find: **`DriftShield/driftshield`**
3. Click **"Import"**

---

### 3. Add Environment Variables

**Click "Add Environment Variables" and paste ALL of these:**

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_RPC_URL=https://api.devnet.solana.com
FACILITATOR_URL=https://facilitator.payai.network
ADDRESS=53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp
TREASURY_WALLET=53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp
```

**Important:** Make sure to check ✓ for:
- Production ✓
- Preview ✓
- Development ✓

---

### 4. Click Deploy

Wait 2-3 minutes... ☕

Your app will be live at:
```
https://your-project-name.vercel.app
```

---

## Test It Works

### 1. Test Discovery Endpoint
```bash
curl https://your-project-name.vercel.app/api/x402/discovery
```

Should return JSON with x402 metadata ✅

### 2. Open in Browser
Visit: `https://your-project-name.vercel.app`

### 3. Get Test USDC

**Switch wallet to devnet:**
1. Open Phantom/Solflare
2. Settings → Network → **Devnet**

**Get devnet SOL:**
```bash
solana airdrop 1 YOUR_WALLET --url devnet
```
Or: https://faucet.solana.com

**Get devnet USDC:**
1. Visit: https://spl-token-faucet.com/
2. Select: **USDC (devnet)**
3. Paste wallet address
4. Click **"Request Airdrop"**

### 4. Try Placing a Bet

1. Connect wallet (on devnet)
2. Go to Markets
3. Select a market
4. Click "Place Bet"
5. Pay $1 USDC (via x402)
6. Bet should be placed! 🎉

---

## Submit to x402scan

Once testing works:

1. **Visit:** https://x402scan.com
2. **Submit discovery URL:**
   ```
   https://your-project-name.vercel.app/api/x402/discovery
   ```
3. **Wait for approval** (may take hours/days)
4. **Your app will be listed** on x402scan! 🎊

---

## Submit to Hackathon

**Category:** Best x402 API Integration ($10,000)

**What to submit:**
- Live URL: `https://your-project-name.vercel.app`
- GitHub: `https://github.com/DriftShield/driftshield`
- Discovery: `https://your-project-name.vercel.app/api/x402/discovery`
- Video demo (optional but recommended)

**Highlight:**
- ✅ Full x402 implementation
- ✅ x402scan compliant
- ✅ Real USDC payments
- ✅ Production-ready
- ✅ Open source

---

## Troubleshooting

### Build Failed ❌
Go to Vercel → Deployments → View logs

Common issues:
- Missing env vars → Add them in Settings
- Build error → Test locally: `npm run build`

### 402 Not Working ❌
- Check `FACILITATOR_URL` is exactly: `https://facilitator.payai.network`
- Verify all env vars are set
- Redeploy after adding vars

### No USDC in Wallet ❌
- Make sure on **devnet** not mainnet
- Use faucet: https://spl-token-faucet.com/
- Need USDC, not just SOL

---

## Need More Help?

📖 **Detailed Guide:** [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
✅ **Checklist:** [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)
📚 **Full Docs:** [README.md](./README.md)

---

## You're Done! 🎉

You now have:
- ✅ Live prediction market app
- ✅ Working x402 payments
- ✅ Ready for hackathon
- ✅ Ready for x402scan

**Share your project:**
```
Just deployed DriftShield - prediction markets with x402 payments! 🚀

Try it: https://your-project-name.vercel.app
Code: https://github.com/DriftShield/driftshield

#Solana #x402 #Web3
```
