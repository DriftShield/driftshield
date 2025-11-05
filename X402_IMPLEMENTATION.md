# X402 Protocol Implementation

## Overview

This project now uses the **proper X402 protocol** with PayAI facilitator for payment-gated betting.

**Payment Method**: USDC on Solana
**Cost per Bet**: $1.00 USDC

## Architecture

### Before (Incorrect)
- ❌ Client directly broadcasts payment transactions
- ❌ Server verifies payment on-chain (slow, after confirmation)
- ❌ No facilitator
- ❌ No nonce/replay protection
- ❌ User pays gas fees

### After (Correct X402)
- ✅ Uses `x402-next` middleware
- ✅ PayAI facilitator handles verification
- ✅ Proper HTTP 402 Payment Required flow
- ✅ Fast payment verification (via facilitator)
- ✅ Production-ready

## How It Works

### 1. Middleware (middleware.ts)
```typescript
// Applies x402 payment verification to protected routes
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/x402-bet')) {
    const x402Middleware = paymentMiddleware(
      payTo,
      {
        'POST /api/x402-bet': {
          price: '$1.00',       // $1.00 USDC per bet
          network: 'solana',
        }
      },
      { url: 'https://facilitator.payai.network' }
    );
    return await x402Middleware(request);
  }
}
```

### 2. API Route (/app/api/x402-bet/route.ts)
```typescript
export async function POST(request: NextRequest) {
  // Payment already verified by middleware!
  // Just handle business logic

  const { marketId, outcome, betAmount, userWallet } = await request.json();

  // Create bet authorization
  return NextResponse.json({
    success: true,
    authorization: { ... }
  });
}
```

### 3. Client Hook (lib/hooks/useX402BetSimplified.ts)
```typescript
const { placeBetWithX402 } = useX402BetSimplified();

// Simple! Middleware handles x402 protocol
await placeBetWithX402(marketId, outcome, betAmount, userWallet);
```

## Payment Flow

1. **Client** makes request to `/api/x402-bet`
2. **Middleware** intercepts and returns `402 Payment Required` with payment details
3. **Client** pays via PayAI facilitator (USDC on Solana)
4. **Facilitator** verifies payment and co-signs
5. **Middleware** receives proof, verifies with facilitator
6. **Route handler** processes bet with authorization

## Configuration

### Environment Variables (.env.local)
```bash
# X402 Facilitator
FACILITATOR_URL=https://facilitator.payai.network

# Your treasury wallet (receives payments)
ADDRESS=53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp
TREASURY_WALLET=53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp
```

## Installed Packages

- `x402-next@latest` - Next.js middleware for x402 protocol
- `x402-express@latest` - Express middleware (for reference)

## Key Files

1. **middleware.ts** - X402 payment middleware configuration
2. **app/api/x402-bet/route.ts** - Protected bet endpoint
3. **lib/hooks/useX402BetSimplified.ts** - Client-side hook
4. **.env.local** - Environment configuration

## Benefits

### Security
- ✅ Nonce-based replay protection (handled by facilitator)
- ✅ Cryptographic payment verification
- ✅ No private keys in client code

### Performance
- ✅ Fast verification via facilitator (no waiting for blockchain)
- ✅ Instant finality
- ✅ Better UX

### Developer Experience
- ✅ Simple middleware configuration
- ✅ Works with standard HTTP
- ✅ Easy to test

## Comparison with Old Implementation

| Feature | Old (Incorrect) | New (X402) |
|---------|----------------|------------|
| Protocol | Custom | X402 Standard |
| Facilitator | None | PayAI |
| Payment Verification | On-chain (slow) | Facilitator (fast) |
| Nonce Management | In-memory UUID | Facilitator DB |
| Replay Protection | ❌ | ✅ |
| Gas Fees | User pays | Can be sponsored |
| Complexity | High | Low |

## Next Steps

1. Test the x402 flow end-to-end
2. Update UI components to use `useX402BetSimplified`
3. Consider adding more x402-protected endpoints:
   - Market creation (`POST /api/x402/create-market`)
   - Premium analytics (`GET /api/x402/analytics`)
   - Model inference (`POST /api/x402/inference`)

## Resources

- [PayAI Documentation](https://docs.payai.network)
- [X402 Specification](https://github.com/coinbase/x402)
- [x402-next Package](https://www.npmjs.com/package/x402-next)
- [PayAI Facilitator](https://facilitator.payai.network)
