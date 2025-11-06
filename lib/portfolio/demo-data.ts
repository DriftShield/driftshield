/**
 * Demo data for testing portfolio features
 */

import { recordTrade } from './service';

export function seedDemoPortfolioData(userWallet: string) {
  // Sample trades over the past 30 days
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // Trade 1: Winning position (closed)
  recordTrade(
    userWallet,
    'btc-100k-2024',
    'Will Bitcoin reach $100k in 2024?',
    'YES',
    'BUY',
    100, // 100 shares
    0.45, // bought at 45%
    0.10, // $0.10 fee
  );

  recordTrade(
    userWallet,
    'btc-100k-2024',
    'Will Bitcoin reach $100k in 2024?',
    'YES',
    'SELL',
    100,
    0.68, // sold at 68%
    0.10,
  );

  // Trade 2: Open winning position
  recordTrade(
    userWallet,
    'eth-5k-2025',
    'Will Ethereum reach $5k in 2025?',
    'YES',
    'BUY',
    200,
    0.35,
    0.10,
  );

  // Simulate price update (current price higher than entry)
  // In real app, this would come from market data
  // Position is currently worth more (unrealized gain)

  // Trade 3: Open losing position
  recordTrade(
    userWallet,
    'sol-500-eoy',
    'Will Solana reach $500 by end of year?',
    'YES',
    'BUY',
    150,
    0.55,
    0.10,
  );

  // Trade 4: Closed losing position
  recordTrade(
    userWallet,
    'trump-2024',
    'Will Trump win 2024 election?',
    'NO',
    'BUY',
    300,
    0.40,
    0.10,
  );

  recordTrade(
    userWallet,
    'trump-2024',
    'Will Trump win 2024 election?',
    'NO',
    'SELL',
    300,
    0.25, // sold at loss
    0.10,
  );

  // Trade 5: Multiple entries (averaging down)
  recordTrade(
    userWallet,
    'ai-agi-2025',
    'Will AGI be achieved in 2025?',
    'NO',
    'BUY',
    100,
    0.70,
    0.10,
  );

  recordTrade(
    userWallet,
    'ai-agi-2025',
    'Will AGI be achieved in 2025?',
    'NO',
    'BUY',
    100,
    0.60, // averaged down
    0.10,
  );

  // Trade 6: Small position
  recordTrade(
    userWallet,
    'mars-2030',
    'Will humans land on Mars by 2030?',
    'YES',
    'BUY',
    50,
    0.15,
    0.10,
  );

  console.log('✅ Demo portfolio data seeded!');
  console.log('Navigate to /dashboard/portfolio to view');
}

export function clearDemoData() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('driftshield_positions');
  localStorage.removeItem('driftshield_closed_positions');
  localStorage.removeItem('driftshield_trades');

  console.log('✅ Demo data cleared');
}
