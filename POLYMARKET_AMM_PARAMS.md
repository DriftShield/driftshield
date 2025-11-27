# Polymarket & Prediction Market AMM Parameters

## The Problem: Markets Don't Move Enough

With `virtualLiquidity = 1000`:
```
Initial: YES 50%, NO 50%
Bet 100 SOL on YES
New: YES 52%, NO 48%  ← Only 2% movement!
```

This is boring and doesn't reflect real market dynamics.

## What Polymarket Uses

Polymarket actually uses a **hybrid model**:
1. **CLOB (Central Limit Order Book)** - Primary liquidity
2. **AMM backstop** - For when order book is thin
3. **Very low virtual liquidity** - Makes prices responsive

### Key Insight: Virtual Liquidity vs Market Size

**Virtual liquidity should be 10-20% of expected total volume**, not a fixed high number.

| Market Type | Expected Volume | Virtual Liquidity | Price Sensitivity |
|-------------|-----------------|-------------------|-------------------|
| New/Small | $100-1K | **10-50** | Very responsive |
| Medium | $1K-10K | **50-200** | Moderate |
| Large | $10K-100K | **200-500** | Stable |
| Mega | $100K+ | **500-1000** | Very stable |

## Real-World Examples

### Polymarket's Approach

```typescript
// Polymarket uses liquidity ~10-20% of expected volume
// For a $10K market:
virtualLiquidity = 10_000 * 0.15 = 1,500 USDC

// But for NEW markets (most common):
virtualLiquidity = 100 USDC  // Very responsive!
```

### Gnosis Prediction Markets

```typescript
// LMSR with very low b parameter
liquidityParameter = 50-100  // For small markets
liquidityParameter = 500     // For large markets
```

### Augur

```typescript
// Constant Product with dynamic liquidity
initialLiquidity = expectedVolume * 0.1
```

## Recommended DriftShield Defaults

### For Binary Markets (YES/NO)

```rust
// Small markets (most common)
virtual_liquidity: 20-50

// Medium markets
virtual_liquidity: 100-200

// Large markets
virtual_liquidity: 500-1000
```

### Example with Different Liquidity

**Virtual Liquidity = 20:**
```
Initial: YES 50%, NO 50%
Bet 1 SOL on YES
New: YES 52.5%, NO 47.5%  ← 2.5% movement ✓

Bet 10 SOL on YES
New: YES 60%, NO 40%  ← 10% movement ✓✓

Bet 50 SOL on YES
New: YES 71.4%, NO 28.6%  ← 21.4% movement! 🚀
```

**Virtual Liquidity = 100:**
```
Initial: YES 50%, NO 50%
Bet 10 SOL on YES
New: YES 54.5%, NO 45.5%  ← 4.5% movement

Bet 50 SOL on YES
New: YES 60%, NO 40%  ← 10% movement
```

**Virtual Liquidity = 1000 (your current default):**
```
Initial: YES 50%, NO 50%
Bet 10 SOL on YES
New: YES 50.5%, NO 49.5%  ← Only 0.5% movement 😴

Bet 50 SOL on YES
New: YES 52.4%, NO 47.6%  ← Only 2.4% movement 💤
```

## Polymarket's Secret Sauce

Polymarket combines:

1. **Low initial liquidity** (50-200 USDC)
2. **Order book** for better prices on large trades
3. **Dynamic liquidity** - Increases as volume grows

### Polymarket CLOB Example

```typescript
// Order Book
Bids (to buy YES):
0.51 - 100 shares
0.50 - 500 shares
0.49 - 200 shares

Asks (to sell YES):
0.52 - 150 shares
0.53 - 300 shares
0.54 - 400 shares

// AMM only fills when order book is empty
// Virtual liquidity: 100 USDC (backup only)
```

## LMSR vs Constant Product

### LMSR (Better for Prediction Markets)

```typescript
// Gnosis uses LMSR with b = 100
b = 100  // Liquidity parameter

// Price movement is more stable
Bet 10 SOL → Price moves ~3%
Bet 50 SOL → Price moves ~12%
Bet 100 SOL → Price moves ~20%

// Bounded loss: Market maker can't lose more than b
```

### Constant Product (What you have)

```typescript
// Uniswap-style: x * y = k
virtual_liquidity = 50

// Price movement is more dramatic
Bet 10 SOL → Price moves ~9%
Bet 50 SOL → Price moves ~33%
Bet 100 SOL → Price moves ~50%

// Unbounded loss: Can lose everything
```

## Recommended Updates for DriftShield

### 1. Lower Default Virtual Liquidity

```rust
// Instead of 1000, use 50 as default
pub fn create_market(
    // ...
    virtual_liquidity: u64,  // Default: 50
) -> Result<()> {
    require!(virtual_liquidity >= 10, ErrorCode::LiquidityTooLow);
    require!(virtual_liquidity <= 10000, ErrorCode::LiquidityTooHigh);

    // Use 50 if not specified
    let liquidity = if virtual_liquidity == 0 { 50 } else { virtual_liquidity };

    market.virtual_yes_reserve = liquidity;
    market.virtual_no_reserve = liquidity;
    market.k_constant = liquidity * liquidity;
}
```

### 2. Dynamic Liquidity (Advanced)

```rust
// Increase liquidity as volume grows
pub fn update_virtual_liquidity(&mut self) {
    let total_volume = self.yes_pool + self.no_pool;

    // Start at 50, grow to max 500
    let target_liquidity = 50 + (total_volume / 100).min(450);

    // Gradually adjust
    self.virtual_yes_reserve = target_liquidity;
    self.virtual_no_reserve = target_liquidity;
    self.k_constant = target_liquidity * target_liquidity;
}
```

### 3. Market Maker Incentives

```typescript
// Polymarket pays market makers to provide liquidity
// You could charge a 2% fee and use it to deepen liquidity

feeAmount = betAmount * 0.02
// Add half to virtual reserves
market.virtual_yes_reserve += feeAmount / 2
market.virtual_no_reserve += feeAmount / 2
```

## Comparison Table

| Platform | Model | Virtual Liquidity | Price Sensitivity |
|----------|-------|-------------------|-------------------|
| **Polymarket** | CLOB + AMM | 50-200 USDC | High |
| **Gnosis** | LMSR | b = 100-500 | Medium-High |
| **Augur** | Constant Product | 100-500 | Medium |
| **DriftShield (current)** | Constant Product | **1000** 😴 | **Too Low** |
| **DriftShield (recommended)** | Constant Product | **20-100** ✓ | **Good** |

## Quick Fix

Change your market creation to use **50** instead of **1000**:

```typescript
// Before
const market = await createMarket({
  virtualLiquidity: 1000,  // ❌ Too high
});

// After
const market = await createMarket({
  virtualLiquidity: 50,  // ✅ Much better
});
```

## Test It

```typescript
// With virtual liquidity = 50
const pool = ConstantProductAMM.initializePool(50);

// Bet 5 SOL on YES
const result = ConstantProductAMM.calculateSharesOut(pool, 5, 'YES');
console.log('Price impact:', (result.priceImpact * 100).toFixed(1) + '%');
// Output: ~9.5% (good movement!)

// Bet 10 SOL on YES
const result2 = ConstantProductAMM.calculateSharesOut(pool, 10, 'YES');
console.log('Price impact:', (result2.priceImpact * 100).toFixed(1) + '%');
// Output: ~16.7% (exciting!)
```

## Bottom Line

✅ Use **50** for default virtual liquidity
✅ Allow users to customize (10-500 range)
✅ Consider LMSR for better stability
✅ Add dynamic liquidity adjustment
✅ Monitor and adjust based on real usage

Lower liquidity = More price movement = More exciting markets!
