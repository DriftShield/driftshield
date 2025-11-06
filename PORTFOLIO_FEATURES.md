# 📊 Portfolio Management Features

DriftShield now includes comprehensive portfolio management and analytics tools to help you track performance, manage risk, and optimize position sizing.

## 🎯 Features

### 1. Portfolio Analytics Dashboard
**Location:** `/dashboard/portfolio`

Track your complete trading performance:
- **Total Value** - Current portfolio value vs invested capital
- **Total P&L** - Combined realized and unrealized profits/losses
- **Win Rate** - Percentage of profitable closed positions
- **Risk Score** - 0-100 score indicating portfolio risk level

### 2. Position Tracking

**Open Positions:**
- Real-time P&L tracking
- Average entry price calculation
- Current value and unrealized gains/losses
- Position details (shares, prices, dates)

**Closed Positions:**
- Historical trade performance
- Realized P&L
- Holding periods
- Entry and exit prices

### 3. Risk Metrics

**Portfolio Concentration:**
- Top position % of portfolio
- Top 3 positions % of portfolio
- Herfindahl Index (diversification measure)

**Exposure Analysis:**
- Total capital deployed
- Available balance
- Deployment percentage with visual indicators

**Diversification:**
- Number of unique markets
- Category breakdown
- YES/NO outcome balance

### 4. Position Sizing Calculator

Uses **Kelly Criterion** for optimal bet sizing:

```
Kelly % = (Edge / Odds)
Edge = Your Win Probability - Market Odds
```

**Features:**
- Adjustable win probability estimates
- Three risk tolerance levels:
  - Conservative (1/4 Kelly)
  - Moderate (1/2 Kelly)
  - Aggressive (Full Kelly)
- Automatic risk management caps (max 10% per position)
- Portfolio concentration limits (max 80% deployed)
- Edge analysis and recommendations

**Usage:**
```typescript
import { calculatePositionSizing } from '@/lib/portfolio/calculator';

const recommendation = calculatePositionSizing(
  'Will Bitcoin hit $100k?',
  'btc-100k',
  0.65, // Current odds 65%
  0.75, // Your estimated win probability 75%
  10000, // Your total bankroll $10,000
  existingPositions,
  'moderate' // Risk tolerance
);

console.log(recommendation.suggestedPosition); // e.g., $250
console.log(recommendation.reasoning); // Detailed analysis
```

### 5. Trade History

Complete audit trail of all trades:
- Buy and sell transactions
- Timestamps and prices
- Total costs including fees
- Transaction signatures (blockchain verification)

### 6. CSV Export

Export all portfolio data for external analysis:
- Open positions
- Closed positions
- Complete trade history
- Formatted for Excel/Google Sheets

**Usage:**
```typescript
import { exportToCSV } from '@/lib/portfolio/calculator';

const csv = exportToCSV(openPositions, closedPositions, trades);
// Download as file
const blob = new Blob([csv], { type: 'text/csv' });
const url = window.URL.createObjectURL(blob);
```

## 🚀 Quick Start

### View Your Portfolio

1. Connect your wallet
2. Navigate to **Dashboard → Portfolio**
3. View your performance metrics

### Test with Demo Data

```typescript
import { seedDemoPortfolioData } from '@/lib/portfolio/demo-data';

// Seed sample data
seedDemoPortfolioData(publicKey.toString());

// Clear when done
import { clearDemoData } from '@/lib/portfolio/demo-data';
clearDemoData();
```

### Track Trades Automatically

```typescript
import { usePortfolioTracking } from '@/lib/hooks/usePortfolioTracking';

function YourComponent() {
  const { trackBetPlacement } = usePortfolioTracking();

  const placeBet = async () => {
    // ... place bet logic ...

    // Track in portfolio
    trackBetPlacement(
      marketId,
      marketTitle,
      'YES',
      shares,
      price,
      fee,
      txSignature
    );
  };
}
```

## 📐 Formula Reference

### Kelly Criterion
```
Kelly % = (bp - q) / b

Where:
b = odds - 1 (decimal odds minus 1)
p = probability of winning
q = probability of losing (1 - p)
```

**Example:**
- Market odds: 60% (0.60)
- Your estimate: 70% (0.70)
- Edge: 10% (0.10)
- Kelly %: 0.10 / 0.60 = 16.67% of bankroll
- With 1/2 Kelly: 8.33% of bankroll

### Herfindahl Index
```
H = Σ(market_share_i)²

Where:
market_share_i = position value / total portfolio value

Range: 0 to 1
- 0 = perfectly diversified
- 1 = completely concentrated
```

### Risk Score
```
Risk Score = Concentration Risk + Exposure Risk

Concentration Risk = Herfindahl Index × 50
Exposure Risk = min(Deployment % / 2, 50)

Range: 0 to 100
- 0-40: Low risk (green)
- 40-70: Medium risk (yellow)
- 70-100: High risk (red)
```

## 🗄️ Data Storage

Currently uses **localStorage** for persistence:
- ✅ Works offline
- ✅ No backend required
- ✅ Instant updates
- ⚠️ Browser-specific (data doesn't sync across devices)

**Production Recommendations:**
1. Add database storage (PostgreSQL/MongoDB)
2. Sync positions with on-chain data
3. Back up to cloud storage
4. Enable cross-device sync

## 📊 API Reference

### Portfolio Service

```typescript
// Get positions
import { getOpenPositions, getClosedPositions } from '@/lib/portfolio/service';

const openPos = getOpenPositions(walletAddress);
const closedPos = getClosedPositions(walletAddress);

// Record trades
import { recordTrade } from '@/lib/portfolio/service';

recordTrade(
  walletAddress,
  marketId,
  marketTitle,
  outcome,
  'BUY', // or 'SELL'
  shares,
  price,
  fee,
  txSignature
);

// Update prices
import { updatePositionPrices } from '@/lib/portfolio/service';

updatePositionPrices(walletAddress, {
  'market-1-YES': 0.75,
  'market-2-NO': 0.30,
});
```

### Portfolio Calculator

```typescript
import {
  calculatePortfolioSummary,
  calculateRiskMetrics,
  calculatePositionSizing,
  kellyFraction,
} from '@/lib/portfolio/calculator';

// Get summary stats
const summary = calculatePortfolioSummary(openPositions, closedPositions);

// Analyze risk
const risk = calculateRiskMetrics(positions, totalBankroll);

// Calculate Kelly fraction
const kelly = kellyFraction(0.70, 1/0.60); // 70% win prob, 60% odds
```

## 🎨 UI Components

### Portfolio Page
- Full-featured analytics dashboard
- Tabbed interface (Positions, Closed, Risk, Trades)
- Responsive design
- CSV export button

### Position Sizing Calculator
```typescript
import { PositionSizingCalculator } from '@/components/portfolio/position-sizing-calculator';

<PositionSizingCalculator
  marketId={market.id}
  marketTitle={market.question}
  currentOdds={0.65}
  userBankroll={10000}
  existingPositions={positions}
/>
```

## 🔮 Future Enhancements

**Planned:**
- [ ] Performance charts (equity curve)
- [ ] Sharpe ratio calculation
- [ ] Maximum drawdown tracking
- [ ] Monte Carlo simulations
- [ ] Auto-rebalancing recommendations
- [ ] Tax loss harvesting tools
- [ ] Multi-wallet support
- [ ] Cloud backup/sync

**Advanced:**
- [ ] Machine learning P&L predictions
- [ ] Automated trading bots
- [ ] Risk alerts and notifications
- [ ] Portfolio optimization algorithms
- [ ] Correlation analysis between positions

## 🐛 Troubleshooting

**Portfolio not updating?**
- Ensure you're using `recordTrade()` after each bet
- Check localStorage in browser DevTools
- Verify wallet address matches

**Risk metrics showing 0?**
- Need at least one open position
- Positions must have valid current prices
- Check position values are > 0

**CSV export empty?**
- Must have positions or trades to export
- Check browser allows downloads
- Try different browser if blocked

## 📚 Learn More

- [Kelly Criterion Explained](https://en.wikipedia.org/wiki/Kelly_criterion)
- [Portfolio Theory](https://www.investopedia.com/terms/m/modernportfoliotheory.asp)
- [Position Sizing](https://www.investopedia.com/terms/p/position-sizing.asp)
- [Herfindahl Index](https://en.wikipedia.org/wiki/Herfindahl%E2%80%93Hirschman_index)

---

**Built for DriftShield** - Prediction markets with professional portfolio management 🚀
