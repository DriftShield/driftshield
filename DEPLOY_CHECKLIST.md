# 🚀 Vercel Deployment Checklist

## Before You Deploy

### 1. Test Build Locally ✅
```bash
npm run build
npm start
# Visit http://localhost:3000 and test
```

### 2. Have These Ready 📋
- [ ] GitHub account
- [ ] Vercel account (free)
- [ ] Your treasury wallet address: `53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp`

---

## Deploy to Vercel (5 minutes)

### Step 1: Go to Vercel
1. Visit: **https://vercel.com/new**
2. Click **"Continue with GitHub"**
3. Sign in to GitHub

### Step 2: Import Repository
1. Find your repo: **`DriftShield/driftshield`**
2. Click **"Import"**
3. Root Directory: **`.`** (leave as is)
4. Click **"Deploy"** (don't add env vars yet, will fail but that's ok)

### Step 3: Add Environment Variables
1. Go to: **Settings** → **Environment Variables**
2. Add these **one by one**:

```
Variable Name: NEXT_PUBLIC_SOLANA_NETWORK
Value: devnet
Environments: Production ✓ Preview ✓ Development ✓

Variable Name: NEXT_PUBLIC_SOLANA_RPC_URL
Value: https://api.devnet.solana.com
Environments: Production ✓ Preview ✓ Development ✓

Variable Name: SOLANA_RPC_URL
Value: https://api.devnet.solana.com
Environments: Production ✓ Preview ✓ Development ✓

Variable Name: FACILITATOR_URL
Value: https://facilitator.payai.network
Environments: Production ✓ Preview ✓ Development ✓

Variable Name: ADDRESS
Value: 53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp
Environments: Production ✓ Preview ✓ Development ✓

Variable Name: TREASURY_WALLET
Value: 53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp
Environments: Production ✓ Preview ✓ Development ✓
```

### Step 4: Redeploy
1. Go to **Deployments** tab
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**
4. Wait 2-3 minutes ⏱️

### Step 5: Test Deployment ✅
Your app will be at: `https://your-project-name.vercel.app`

**Test it:**
```bash
# 1. Test discovery endpoint
curl https://your-project-name.vercel.app/api/x402/discovery | jq

# 2. Open in browser
# Visit: https://your-project-name.vercel.app

# 3. Connect wallet (make sure on devnet)

# 4. Try to place bet (will need devnet USDC)
```

---

## Get Devnet USDC for Testing

### Step 1: Get Your Wallet Address
1. Open Phantom or Solflare
2. Copy your wallet address

### Step 2: Switch to Devnet
1. Settings → Network → **Devnet**

### Step 3: Get Devnet SOL
```bash
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```
Or visit: https://faucet.solana.com/

### Step 4: Get Devnet USDC
1. Visit: **https://spl-token-faucet.com/**
2. Select: **USDC (devnet)**
3. Paste your wallet address
4. Click **"Request Airdrop"**
5. Wait 30 seconds
6. Check wallet - you should have USDC

---

## Submit to x402scan

### After Deployment Works:

1. **Test discovery endpoint:**
   ```bash
   curl https://your-project-name.vercel.app/api/x402/discovery
   ```
   Should return JSON with `x402Version`, `accepts`, etc.

2. **Submit to x402scan:**
   - Visit: **https://x402scan.com**
   - Look for "Submit" or "Add Service"
   - Enter URL: `https://your-project-name.vercel.app/api/x402/discovery`
   - Submit for review

3. **Wait for listing** (may take a few hours/days)

---

## Troubleshooting

### Build Fails ❌
**Error: "Module not found"**
```bash
# Test locally first
npm install
npm run build
```

**Error: "Environment variable missing"**
- Double-check all 6 env vars are added in Vercel
- Make sure they're checked for Production, Preview, AND Development

### Middleware Not Working ❌
**Error: "402 not returning"**
- Check `middleware.ts` is in root directory
- Verify `FACILITATOR_URL` is exactly: `https://facilitator.payai.network`
- Redeploy after adding env vars

### Wallet Won't Connect ❌
**Error: "Wallet connection failed"**
- Make sure wallet is on **devnet** (Settings → Network → Devnet)
- Refresh page after switching networks
- Clear browser cache

### Markets Not Loading ❌
**Error: "Failed to fetch markets"**
- Check browser console for errors
- Verify Polymarket API is accessible
- Check RPC endpoint is responding

### Payment Fails ❌
**Error: "Payment verification failed"**
- Make sure you have USDC in wallet (not just SOL)
- Check you're on devnet
- Verify facilitator URL is correct

---

## Next Steps After Successful Deploy

1. ✅ **Share Your Link**
   - Tweet: "Just deployed DriftShield - prediction markets with x402 payments! 🚀"
   - Add URL: `https://your-project-name.vercel.app`

2. ✅ **Submit to Hackathon**
   - Category: "Best x402 API Integration"
   - Include your Vercel URL
   - Link to GitHub repo

3. ✅ **Monitor Usage**
   - Vercel Analytics: Dashboard → Analytics
   - Check logs: `vercel logs`

4. ✅ **Get Feedback**
   - Share with friends
   - Test payment flow
   - Fix any bugs

---

## Quick Reference

**Your URLs:**
- App: `https://your-project-name.vercel.app`
- Discovery: `https://your-project-name.vercel.app/api/x402/discovery`
- GitHub: `https://github.com/DriftShield/driftshield`

**Important Links:**
- Vercel Dashboard: https://vercel.com/dashboard
- x402scan: https://x402scan.com
- USDC Faucet: https://spl-token-faucet.com
- Solana Faucet: https://faucet.solana.com

**Support:**
- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Your README: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

---

## Done! 🎉

You should now have:
- ✅ Live app on Vercel
- ✅ Working x402 payments
- ✅ Discovery endpoint for x402scan
- ✅ Ready for hackathon submission

**Need help?** Check [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed troubleshooting.
