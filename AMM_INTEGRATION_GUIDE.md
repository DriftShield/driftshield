# Virtual Liquidity Pool (AMM) Integration Guide

This guide explains how to add Automated Market Maker (AMM) functionality to DriftShield markets.

## Overview

Instead of peer-to-peer betting, users bet against a **virtual liquidity pool** that automatically adjusts prices based on supply and demand.

### Benefits

✅ **Instant Execution** - No need to wait for counterparty
✅ **Always Liquid** - Markets never run out of liquidity
✅ **Fair Pricing** - Algorithmic price discovery
✅ **No Initial Capital** - Virtual reserves, not real money
✅ **Multi-Outcome Support** - Works with 2-10 outcomes

## AMM Types

### 1. Constant Product (xy=k)

**Best for:** Simple binary markets, fast price movement

```typescript
// Example: Binary YES/NO market
const pool = ConstantProductAMM.initializePool(1000);
// Initial: YES 50%, NO 50%

// User bets 100 SOL on YES
const result = ConstantProductAMM.calculateSharesOut(pool, 100, 'YES');
// New: YES 52%, NO 48%
// User gets: 98 shares
```

**Formula:**
```
yesReserve * noReserve = k (constant)
Price(YES) = yesReserve / (yesReserve + noReserve)
```

### 2. LMSR (Logarithmic Market Scoring Rule)

**Best for:** Prediction markets, multi-outcome, stable pricing

```typescript
// Example: Election with 3 candidates
const pool = LMSRAMM.initializePool(['Alice', 'Bob', 'Charlie'], 500);
// Initial: Alice 33%, Bob 33%, Charlie 33%

// User bets 100 SOL on Alice
const result = LMSRAMM.calculateSharesForBet(pool, 0, 100);
// New: Alice 38%, Bob 31%, Charlie 31%
// User gets: 105 shares
```

**Formula:**
```
C(q) = b * ln(e^(q_1/b) + e^(q_2/b) + ... + e^(q_n/b))
Price(i) = e^(q_i/b) / sum(e^(q_j/b))
```

## Smart Contract Integration

### Rust Program Changes

You need to modify your Solana program to include AMM logic:

```rust
// programs/prediction_bets/src/state.rs

#[account]
pub struct Market {
    // ... existing fields ...

    // AMM fields
    pub amm_enabled: bool,
    pub amm_type: AMMType,  // 0 = Constant Product, 1 = LMSR
    pub virtual_reserves: Vec<u64>,  // Virtual liquidity for each outcome
    pub liquidity_parameter: u64,    // For LMSR only
    pub k_constant: u128,            // For Constant Product (x*y=k)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum AMMType {
    ConstantProduct,
    LMSR,
}
```

### Place Bet with AMM

```rust
// programs/prediction_bets/src/lib.rs

pub fn place_bet_amm(
    ctx: Context<PlaceBetAMM>,
    outcome_index: u8,
    amount: u64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;

    require!(market.amm_enabled, ErrorCode::AMMNotEnabled);

    // Calculate shares based on AMM type
    let shares = match market.amm_type {
        AMMType::ConstantProduct => {
            calculate_cp_shares(market, outcome_index, amount)?
        },
        AMMType::LMSR => {
            calculate_lmsr_shares(market, outcome_index, amount)?
        },
    };

    // Update virtual reserves
    market.virtual_reserves[outcome_index as usize] += amount;

    // Update real bets
    market.outcome_amounts[outcome_index as usize] += amount;

    // Transfer SOL to vault
    transfer_to_vault(ctx, amount)?;

    // Create bet account with shares
    let bet = &mut ctx.accounts.bet;
    bet.shares = shares;
    bet.outcome_index = outcome_index;
    bet.amount = amount;

    Ok(())
}

// Helper: Constant Product calculation
fn calculate_cp_shares(
    market: &Market,
    outcome_index: u8,
    bet_amount: u64,
) -> Result<u64> {
    let idx = outcome_index as usize;
    let yes_reserve = market.virtual_reserves[idx];
    let no_reserve = market.virtual_reserves[1 - idx];
    let k = market.k_constant;

    // New reserves after bet
    let new_yes_reserve = yes_reserve + bet_amount;
    let new_no_reserve = (k as u64) / new_yes_reserve;

    // Shares = change in opposite reserve
    let shares = no_reserve - new_no_reserve;

    Ok(shares)
}

// Helper: LMSR calculation
fn calculate_lmsr_shares(
    market: &Market,
    outcome_index: u8,
    bet_amount: u64,
) -> Result<u64> {
    let b = market.liquidity_parameter as f64;

    // Cost function: C(q) = b * ln(sum(e^(q_i/b)))
    let cost_before = lmsr_cost_function(&market.virtual_reserves, b);

    // Binary search to find shares that match bet amount
    let shares = binary_search_lmsr_shares(
        &market.virtual_reserves,
        outcome_index,
        bet_amount as f64,
        b,
    )?;

    Ok(shares)
}

fn lmsr_cost_function(reserves: &[u64], b: f64) -> f64 {
    let sum_exp: f64 = reserves
        .iter()
        .map(|&q| ((q as f64) / b).exp())
        .sum();
    b * sum_exp.ln()
}

// Binary search for LMSR shares
fn binary_search_lmsr_shares(
    reserves: &[u64],
    outcome_idx: u8,
    target_cost: f64,
    b: f64,
) -> Result<u64> {
    let mut low = 0.0;
    let mut high = target_cost * 10.0;
    let tolerance = 0.001;

    while high - low > tolerance {
        let mid = (low + high) / 2.0;

        let mut new_reserves = reserves.to_vec();
        new_reserves[outcome_idx as usize] += mid as u64;

        let cost = lmsr_cost_function(&new_reserves, b)
                 - lmsr_cost_function(reserves, b);

        if cost < target_cost {
            low = mid;
        } else {
            high = mid;
        }
    }

    Ok(low as u64)
}
```

### Claim Payout with AMM

```rust
pub fn claim_payout_amm(ctx: Context<ClaimPayoutAMM>) -> Result<()> {
    let market = &ctx.accounts.market;
    let bet = &ctx.accounts.bet;

    require!(market.is_resolved, ErrorCode::MarketNotResolved);
    require!(!bet.is_claimed, ErrorCode::AlreadyClaimed);
    require!(
        bet.outcome_index == market.winning_outcome,
        ErrorCode::LosingBet
    );

    // Calculate payout based on shares
    let total_real_bets: u64 = market.outcome_amounts.iter().sum();
    let winning_real_bets = market.outcome_amounts[market.winning_outcome as usize];

    // Payout = shares * (total_pot / winning_shares)
    let payout = (bet.shares as u128)
        .checked_mul(total_real_bets as u128)
        .unwrap()
        .checked_div(winning_real_bets as u128)
        .unwrap() as u64;

    // Transfer from vault to user
    transfer_from_vault(ctx, payout)?;

    // Mark as claimed
    let bet = &mut ctx.accounts.bet;
    bet.is_claimed = true;

    Ok(())
}
```

## Frontend Integration

### Update Market Component

```typescript
// app/dashboard/markets/[id]/page.tsx

import { ConstantProductAMM } from '@/lib/amm/constant-product';
import { LMSRAMM } from '@/lib/amm/lmsr';

// Initialize AMM based on market type
const initializeAMM = (market: Market) => {
  if (market.ammType === 'constant-product') {
    return ConstantProductAMM.initializePool(
      market.virtualLiquidity || 1000
    );
  } else {
    return LMSRAMM.initializePool(
      market.outcomes,
      market.liquidityParameter || 500
    );
  }
};

// Show price impact before bet
const showPriceImpact = (pool, betAmount, outcome) => {
  const impact = ConstantProductAMM.calculatePriceImpact(
    pool,
    betAmount,
    outcome
  );

  return (
    <div className="bg-yellow-500/10 p-3 rounded">
      <div className="text-sm">
        Price impact: {(impact.priceImpact * 100).toFixed(2)}%
      </div>
      <div className="text-xs text-muted-foreground">
        New price: {(impact.priceAfter * 100).toFixed(2)}%
      </div>
    </div>
  );
};
```

### Real-time Price Updates

```typescript
// Update prices after each bet
const handleBetPlaced = async (market: Market, bet: Bet) => {
  // Fetch updated on-chain reserves
  const marketAccount = await program.account.market.fetch(marketPDA);

  // Recreate AMM state
  const pool = {
    yesReserve: marketAccount.virtualReserves[0].toNumber(),
    noReserve: marketAccount.virtualReserves[1].toNumber(),
    k: marketAccount.kConstant.toNumber(),
    realYesBets: marketAccount.outcomeAmounts[0].toNumber() / 1e9,
    realNoBets: marketAccount.outcomeAmounts[1].toNumber() / 1e9,
  };

  // Update UI with new prices
  const stats = ConstantProductAMM.getPoolStats(pool);
  setMarketPrices({
    yes: stats.yesPrice,
    no: stats.noPrice,
  });
};
```

## Migration Strategy

### Option 1: Hybrid Approach (Recommended)

Keep both P2P and AMM markets:

```typescript
// Market types
enum MarketType {
  P2P = 'p2p',           // Traditional peer-to-peer
  AMM_CP = 'amm-cp',     // Constant Product AMM
  AMM_LMSR = 'amm-lmsr'  // LMSR AMM
}

// Let users choose when creating market
<Select value={marketType} onChange={setMarketType}>
  <option value="p2p">Peer-to-Peer</option>
  <option value="amm-cp">AMM (Constant Product)</option>
  <option value="amm-lmsr">AMM (LMSR)</option>
</Select>
```

### Option 2: Full Migration

Convert all markets to AMM:

1. Deploy new program version with AMM
2. Initialize virtual reserves for existing markets
3. Update frontend to use AMM calculations
4. Migrate user bets to shares

## Configuration

### Choosing Liquidity Parameter

**Constant Product:**
- Virtual reserves = expected total volume
- Example: If you expect $10K total, use 10,000 virtual reserves

**LMSR:**
- Liquidity parameter (b) = max loss you're willing to subsidize
- Higher b = slower price movement (deeper liquidity)
- Lower b = faster price movement (shallower liquidity)

| b Value | Price Sensitivity | Use Case |
|---------|------------------|----------|
| 100     | High sensitivity | Small markets, quick discovery |
| 500     | Medium           | **Recommended default** |
| 1000    | Low sensitivity  | Large markets, stable pricing |
| 5000    | Very stable      | Prediction markets with many outcomes |

## Testing

```bash
# Test AMM calculations
npm run test:amm

# Test on-chain integration (devnet)
anchor test

# Deploy AMM-enabled program
anchor deploy --provider.cluster devnet
```

## Example Markets

### Binary Market (Constant Product)

```typescript
const market = await createMarket({
  question: "Will Bitcoin reach $100K by EOY?",
  outcomes: ["YES", "NO"],
  ammType: "constant-product",
  virtualLiquidity: 1000,
});
```

### Multi-Outcome (LMSR)

```typescript
const market = await createMarket({
  question: "Who will win the 2024 election?",
  outcomes: ["Alice", "Bob", "Charlie", "David"],
  ammType: "lmsr",
  liquidityParameter: 1000,
});
```

## Performance Considerations

### On-Chain

- AMM calculations use floating point math → need careful handling in Rust
- Consider using fixed-point arithmetic for precision
- Gas costs higher for LMSR (logarithm calculations)

### Off-Chain

- Cache AMM state to avoid repeated calculations
- Use WebSockets for real-time price updates
- Debounce price impact previews

## Security

1. **Slippage Protection**: Add max slippage parameter to bets
2. **Front-running**: Use Solana's transaction ordering
3. **Price Manipulation**: Monitor for large coordinated bets
4. **Rounding Errors**: Use checked math in Rust

## Next Steps

1. ✅ Review TypeScript AMM implementations
2. ⬜ Modify Rust program with AMM logic
3. ⬜ Add AMM fields to Market account
4. ⬜ Implement place_bet_amm instruction
5. ⬜ Update frontend components
6. ⬜ Test on devnet
7. ⬜ Deploy to mainnet

## Resources

- [Uniswap v2 Whitepaper](https://uniswap.org/whitepaper.pdf) - Constant Product AMM
- [Gnosis Prediction Markets](https://docs.gnosis.io/conditionaltokens/) - LMSR implementation
- [Hanson's LMSR Paper](http://mason.gmu.edu/~rhanson/mktscore.pdf) - Original LMSR research
- [Polymarket Architecture](https://docs.polymarket.com) - Hybrid order book + AMM

---

**Questions?** Open an issue or reach out on Discord.
