/**
 * Demo data for social trading features
 */

import { updateTraderProfile } from './service';
import { seedDemoPortfolioData } from '../portfolio/demo-data';

export function seedSocialDemoData(currentUserWallet: string) {
  // Create demo trader profiles with realistic data
  const demoTraders = [
    {
      wallet: 'Demo1Alpha111111111111111111111111111111',
      username: 'alpha_trader',
      displayName: 'Alpha Trader',
      bio: 'Specializing in crypto markets. 5+ years experience trading derivatives.',
      stats: { winRate: 72.5, totalPnL: 15420, roi: 145.3, volumeTraded: 45000, totalTrades: 89 },
      badges: ['top_10', 'verified', 'whale', 'high_roi'],
    },
    {
      wallet: 'Demo2Beta222222222222222222222222222222',
      username: 'beta_whale',
      displayName: 'Beta Whale',
      bio: 'High volume trader focused on political and sports markets.',
      stats: { winRate: 68.2, totalPnL: 12100, roi: 98.5, volumeTraded: 78000, totalTrades: 124 },
      badges: ['top_10', 'whale', 'consistent'],
    },
    {
      wallet: 'Demo3Gamma333333333333333333333333333333',
      username: 'gamma_gains',
      displayName: 'Gamma Gains',
      bio: 'Conservative trader with consistent returns. Risk management is key!',
      stats: { winRate: 85.0, totalPnL: 5200, roi: 52.1, volumeTraded: 18000, totalTrades: 40 },
      badges: ['top_50', 'consistent'],
    },
    {
      wallet: 'Demo4Delta444444444444444444444444444444',
      username: 'delta_degen',
      displayName: 'Delta Degen',
      bio: 'High risk, high reward. YOLO into every bet.',
      stats: { winRate: 45.5, totalPnL: -2100, roi: -15.8, volumeTraded: 25000, totalTrades: 156 },
      badges: [],
    },
    {
      wallet: 'Demo5Epsilon555555555555555555555555555555',
      username: 'epsilon_edge',
      displayName: 'Epsilon Edge',
      bio: 'Data-driven trader. Numbers don\'t lie.',
      stats: { winRate: 65.3, totalPnL: 8900, roi: 78.2, volumeTraded: 32000, totalTrades: 75 },
      badges: ['top_50', 'specialist'],
    },
  ];

  demoTraders.forEach(trader => {
    // First seed portfolio data for each trader
    seedDemoPortfolioData(trader.wallet);

    // Then update their profile
    updateTraderProfile(trader.wallet, {
      username: trader.username,
      displayName: trader.displayName,
      bio: trader.bio,
      verified: trader.badges.includes('verified'),
      badges: trader.badges as any[],
      social: {
        followers: Math.floor(Math.random() * 500),
        following: Math.floor(Math.random() * 100),
        totalCopiers: Math.floor(Math.random() * 50),
      },
    });
  });

  // Also seed data for current user
  if (currentUserWallet) {
    seedDemoPortfolioData(currentUserWallet);
  }

  console.log('✅ Social trading demo data seeded!');
  console.log(`Created ${demoTraders.length} demo traders`);
  console.log('Navigate to /dashboard/leaderboard to see them');
}
