# Vercel Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables Setup ✅

You need to add these in Vercel dashboard:

#### Required Variables
```bash
# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_RPC_URL=https://api.devnet.solana.com

# X402 Facilitator
FACILITATOR_URL=https://facilitator.payai.network
ADDRESS=53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp
TREASURY_WALLET=53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp
```

#### Optional Variables (for backend integration)
```bash
NEXT_PUBLIC_API_URL=https://your-backend-api.com
NEXT_PUBLIC_WS_URL=wss://your-backend-api.com/ws
```

---

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Go to [vercel.com](https://vercel.com)**
   - Sign in with GitHub

2. **Click "Add New Project"**
   - Import your GitHub repository: `DriftShield/driftshield`
   - Select the `driftshield-ui` directory (or root if that's where package.json is)

3. **Configure Project**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `.` (or `driftshield-ui` if needed)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add all variables from the list above
   - Important: Use the **Production**, **Preview**, and **Development** scopes

5. **Click "Deploy"**
   - Wait for build to complete (2-3 minutes)
   - Your site will be live at `your-project.vercel.app`

---

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (from project root)
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name? driftshield
# - Directory? ./
# - Override settings? No

# Deploy to production
vercel --prod
```

Then add environment variables:
```bash
# Set env vars
vercel env add FACILITATOR_URL production
vercel env add ADDRESS production
vercel env add NEXT_PUBLIC_SOLANA_NETWORK production
vercel env add NEXT_PUBLIC_SOLANA_RPC_URL production
vercel env add SOLANA_RPC_URL production
vercel env add TREASURY_WALLET production
```

---

## Post-Deployment Configuration

### 1. Update CORS (if using backend)

If you have a backend API, update CORS to allow your Vercel domain:

```typescript
// backend/src/index.ts
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-project.vercel.app',
    'https://driftshield.vercel.app',
  ]
}));
```

### 2. Update Wallet Network

Make sure your wallet is on **devnet**:
- Open Phantom/Solflare
- Settings → Network → Devnet

### 3. Get Devnet USDC

For testing payments:
```
1. Visit: https://spl-token-faucet.com/
2. Select: USDC (devnet)
3. Enter your wallet address
4. Request airdrop
```

### 4. Test Your Deployment

```bash
# Test discovery endpoint
curl https://your-project.vercel.app/api/x402/discovery | jq

# Should return x402 metadata
{
  "x402Version": 1,
  "accepts": [...],
  "payer": "53syax..."
}
```

---

## Custom Domain (Optional)

### Add Custom Domain

1. Go to Vercel Dashboard → Project Settings → Domains
2. Add domain: `driftshield.xyz` or `www.driftshield.xyz`
3. Follow DNS setup instructions
4. Wait for DNS propagation (5-10 minutes)

### DNS Records (Example)

For `driftshield.xyz`:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

For `www.driftshield.xyz`:
```
Type: A
Name: @
Value: 76.76.21.21
```

---

## Environment-Specific Configuration

### Production (Mainnet)

When ready for mainnet, update these variables:

```bash
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Consider paid RPC for better performance:
# NEXT_PUBLIC_SOLANA_RPC_URL=https://YOUR-PROJECT.solana-mainnet.quiknode.pro/YOUR-TOKEN/
# SOLANA_RPC_URL=https://YOUR-PROJECT.solana-mainnet.quiknode.pro/YOUR-TOKEN/
```

### Preview Branches

Vercel automatically creates preview deployments for:
- Pull requests
- Branch pushes

Each gets unique URL: `driftshield-git-branch-name.vercel.app`

---

## Troubleshooting

### Build Fails

**Error: Module not found**
```bash
# Locally test build
npm run build

# Check package.json dependencies
npm install
```

**Error: Environment variable missing**
- Check all required variables are set in Vercel dashboard
- Make sure they're assigned to correct environment (Production/Preview/Development)

### Middleware Not Working

**Error: X402 payments not working**
- Check `FACILITATOR_URL` is set correctly
- Verify `ADDRESS` wallet is correct
- Check middleware.ts is being deployed

```bash
# Verify middleware in build output
vercel logs YOUR_DEPLOYMENT_URL
```

### Markets Not Loading

**Error: Markets fail to load**
- Check Polymarket API is accessible from Vercel
- Verify RPC endpoint is responsive
- Check browser console for CORS errors

### Wallet Connection Issues

**Error: Wallet won't connect**
- Make sure wallet is on same network (devnet/mainnet)
- Clear browser cache
- Check console for errors

---

## Performance Optimization

### 1. Use Paid RPC Provider

Free RPCs can be slow. Consider:
- **QuickNode**: https://www.quicknode.com/
- **Alchemy**: https://www.alchemy.com/
- **Helius**: https://www.helius.dev/

```bash
# Update RPC URLs
NEXT_PUBLIC_SOLANA_RPC_URL=https://YOUR-PROJECT.solana-mainnet.quiknode.pro/TOKEN/
SOLANA_RPC_URL=https://YOUR-PROJECT.solana-mainnet.quiknode.pro/TOKEN/
```

### 2. Enable Edge Runtime (Optional)

For faster API routes, add to route files:
```typescript
export const runtime = 'edge';
```

### 3. Enable Caching

Already configured in Next.js config. Verify in Vercel dashboard:
- Settings → Functions → Edge Functions

---

## Monitoring

### Vercel Analytics

Enable in dashboard:
- Analytics → Enable

### Custom Monitoring

Add Sentry or LogRocket:
```bash
npm install @sentry/nextjs
# or
npm install logrocket
```

---

## Security Checklist

- ✅ Never commit `.env.local` to git
- ✅ Use environment variables in Vercel dashboard
- ✅ Enable "Automatically expose System Environment Variables" in Vercel
- ✅ Don't expose private keys
- ✅ Use HTTPS only (Vercel provides automatically)
- ✅ Enable "Force HTTPS" in domain settings

---

## x402scan Submission

After deployment:

1. **Test discovery endpoint:**
   ```bash
   curl https://your-project.vercel.app/api/x402/discovery
   ```

2. **Submit to x402scan:**
   - Visit: https://x402scan.com
   - Submit URL: `https://your-project.vercel.app/api/x402/discovery`
   - Wait for validation

3. **Verify listing:**
   - Search for "DriftShield" on x402scan
   - Check endpoints are invokable

---

## Continuous Deployment

Automatic deployments on:
- ✅ Push to `main` → Production
- ✅ Push to other branches → Preview
- ✅ Pull requests → Preview

To disable auto-deploy:
- Settings → Git → Production Branch → Disable

---

## Cost Estimation

Vercel Pricing:
- **Hobby (Free)**:
  - 100 GB bandwidth/month
  - 100 GB-hours compute
  - Perfect for testing

- **Pro ($20/month)**:
  - 1 TB bandwidth
  - 1000 GB-hours compute
  - Custom domains
  - Team collaboration

Your app should fit in **Free tier** for testing/hackathon.

---

## Quick Deploy Button

Add to your README for easy deployment:

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/DriftShield/driftshield&env=FACILITATOR_URL,ADDRESS,NEXT_PUBLIC_SOLANA_NETWORK,NEXT_PUBLIC_SOLANA_RPC_URL,SOLANA_RPC_URL,TREASURY_WALLET)
```

---

## Next Steps After Deployment

1. ✅ Test all features on live site
2. ✅ Submit to x402scan
3. ✅ Share URL on Twitter
4. ✅ Submit to hackathon
5. ✅ Monitor analytics

---

## Support

If deployment fails:
- Check Vercel logs: `vercel logs`
- GitHub Issues: https://github.com/DriftShield/driftshield/issues
- Vercel Support: https://vercel.com/support
