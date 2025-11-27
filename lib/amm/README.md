# AMM (Automated Market Maker) Library

TypeScript implementations of AMM algorithms for prediction markets.

## Files

- **`constant-product.ts`** - Simple xy=k AMM (like Uniswap)
- **`lmsr.ts`** - Logarithmic Market Scoring Rule (better for prediction markets)

## Quick Start

### Constant Product AMM

```typescript
import { ConstantProductAMM } from '@/lib/amm/constant-product';

// Initialize pool with 1000 virtual liquidity
const pool = ConstantProductAMM.initializePool(1000);

// Get current prices
console.log(ConstantProductAMM.getYesPrice(pool)); // 0.5 (50%)

// User bets 100 SOL on YES
const result = ConstantProductAMM.calculateSharesOut(pool, 100, 'YES');
console.log(`Received ${result.shares} shares at ${result.avgPrice} per share`);

// Check price impact
const impact = ConstantProductAMM.calculatePriceImpact(pool, 500, 'YES');
console.log(`500 SOL bet would move price by ${impact.priceImpact * 100}%`);
```

### LMSR AMM

```typescript
import { LMSRAMM } from '@/lib/amm/lmsr';

// Binary market
const pool = LMSRAMM.initializePool(['YES', 'NO'], 500);

// Multi-outcome market
const election = LMSRAMM.initializePool(
  ['Alice', 'Bob', 'Charlie'],
  1000
);

// Get all prices
const prices = LMSRAMM.getAllPrices(pool);
console.log(prices); // [0.5, 0.5]

// Bet 100 SOL on outcome 0 (YES)
const result = LMSRAMM.calculateSharesForBet(pool, 0, 100);
console.log(`Received ${result.shares} shares`);

// Get pool statistics
const stats = LMSRAMM.getPoolStats(pool);
console.log(stats);
```

## When to Use Which?

### Constant Product (xy=k)
- ✅ Simple, fast, easy to understand
- ✅ Good for binary markets
- ✅ Quick price discovery
- ⚠️ High slippage on large bets
- ⚠️ Prices can swing wildly

**Best for:** Simple yes/no markets, small volumes

### LMSR
- ✅ Stable pricing
- ✅ Bounded loss for market maker
- ✅ Great for multi-outcome markets
- ✅ Better for prediction markets
- ⚠️ More complex calculations
- ⚠️ Slower price movement

**Best for:** Elections, tournaments, serious prediction markets

## Key Concepts

### Virtual Liquidity

Both AMMs use **virtual reserves** - not real money, just numbers for price calculations.

- Start with virtual tokens (e.g., 1000 YES, 1000 NO)
- Real bets add to virtual reserves
- Only real bets are paid out on resolution
- Virtual liquidity affects price sensitivity

### Price Impact

Large bets move prices more than small bets:

```typescript
// Small bet: low impact
const small = ConstantProductAMM.calculatePriceImpact(pool, 10, 'YES');
// small.priceImpact = 0.01 (1%)

// Large bet: high impact
const large = ConstantProductAMM.calculatePriceImpact(pool, 1000, 'YES');
// large.priceImpact = 0.25 (25%)
```

### Shares vs SOL

- User bets **SOL**
- Receives **shares** in return
- Shares pay out if outcome wins
- Payout = shares × (total_pot / winning_shares)

## Examples

See `/components/amm/amm-demo.tsx` for interactive demo.

Visit `/dashboard/amm-demo` in the app to try it live.

## Integration

To add AMM to your Solana program, see `AMM_INTEGRATION_GUIDE.md` in project root.

## Testing

```bash
# Run AMM calculations
npm run test:amm

# Test specific file
npm run test lib/amm/constant-product.test.ts
```

## Resources

- [Uniswap v2 Whitepaper](https://uniswap.org/whitepaper.pdf)
- [LMSR Paper by Robin Hanson](http://mason.gmu.edu/~rhanson/mktscore.pdf)
- [Gnosis Conditional Tokens](https://docs.gnosis.io/conditionaltokens/)
