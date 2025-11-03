/**
 * Script to update end dates for already-initialized markets
 * Run with: npx ts-node scripts/update-market-dates.ts
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { getMarketPDA } from '../lib/solana/prediction-bets';
import IDL from '../lib/solana/prediction_bets_idl.json';
import * as fs from 'fs';

// Configuration
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('BQtqZ6H72cbMjmSzm6Bv5zKYBF9a6ZwCnbZJNYWNK1xj');
const POLYMARKET_API = 'https://gamma-api.polymarket.com';

interface PolymarketMarket {
  id: string;
  question: string;
  endDate: string;
  active: boolean;
  closed: boolean;
}

async function fetchPolymarketMarkets(): Promise<PolymarketMarket[]> {
  try {
    const response = await fetch(`${POLYMARKET_API}/markets?limit=100&closed=false&active=true`);
    if (!response.ok) {
      throw new Error(`Failed to fetch markets: ${response.statusText}`);
    }
    const data = await response.json();
    return data.filter((m: PolymarketMarket) => !m.closed && m.active);
  } catch (error) {
    console.error('Error fetching Polymarket markets:', error);
    return [];
  }
}

async function updateMarketDates() {
  console.log('🚀 Starting market end date updates...\n');

  // Load wallet keypair
  const keypairPath = process.env.SOLANA_KEYPAIR_PATH || '/Users/ramsis/.config/solana/id.json';

  if (!fs.existsSync(keypairPath)) {
    console.error('❌ Keypair not found at:', keypairPath);
    process.exit(1);
  }

  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log('💼 Wallet:', keypair.publicKey.toString());

  // Create connection
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

  // Check balance
  const balance = await connection.getBalance(keypair.publicKey);
  console.log('💰 Balance:', balance / 1e9, 'SOL\n');

  // Create wallet adapter interface
  const wallet = {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: any) => {
      tx.partialSign(keypair);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      return txs.map(tx => {
        tx.partialSign(keypair);
        return tx;
      });
    },
  };

  const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
  const program = new Program(IDL as any, provider);

  // Fetch markets from Polymarket
  console.log('📊 Fetching markets from Polymarket...');
  const markets = await fetchPolymarketMarkets();
  console.log(`Found ${markets.length} active markets\n`);

  let updatedCount = 0;
  let expiredCount = 0;
  let errorCount = 0;

  const now = Math.floor(Date.now() / 1000);
  const oneYearFromNow = now + (365 * 24 * 60 * 60);

  // Check each market
  for (let i = 0; i < markets.length; i++) {
    const market = markets[i];
    const [marketPDA] = getMarketPDA(market.id);

    try {
      console.log(`\n[${i + 1}/${markets.length}] Checking: ${market.question.slice(0, 60)}...`);

      // Fetch on-chain market data
      let marketData;
      try {
        marketData = await (program.account as any).market.fetch(marketPDA);
      } catch (error) {
        console.log('  ⏭️  Market not initialized on-chain, skipping');
        continue;
      }

      const onChainEndTimestamp = marketData.endTimestamp.toNumber();
      const marketEndDate = market.endDate ? new Date(market.endDate).getTime() / 1000 : oneYearFromNow;

      // Check if on-chain end date is expired or different from Polymarket
      if (onChainEndTimestamp < now) {
        console.log(`  ⚠️  EXPIRED: On-chain end date is ${new Date(onChainEndTimestamp * 1000).toLocaleDateString()}`);

        // Use Polymarket's end date if it's in the future, otherwise use 1 year from now
        let newEndTimestamp: number;
        if (market.endDate) {
          const polymarketEndTime = new Date(market.endDate).getTime() / 1000;
          newEndTimestamp = polymarketEndTime > now ? polymarketEndTime : oneYearFromNow;
        } else {
          newEndTimestamp = oneYearFromNow;
        }

        console.log(`  🔧  Updating to: ${new Date(newEndTimestamp * 1000).toLocaleDateString()}`);
        console.log(`  ℹ️  Note: Anchor doesn't have an update instruction - market will remain with old date`);
        console.log(`  ℹ️  Recommendation: Users should bet on markets with future end dates only`);

        expiredCount++;
      } else {
        console.log(`  ✅ Valid end date: ${new Date(onChainEndTimestamp * 1000).toLocaleDateString()}`);
        updatedCount++;
      }

    } catch (error: any) {
      console.error(`  ❌ Error:`, error.message);
      errorCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📈 UPDATE SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Valid markets: ${updatedCount}`);
  console.log(`⚠️  Expired markets: ${expiredCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`\n⚠️  IMPORTANT: ${expiredCount} markets have expired end dates on-chain.`);
  console.log(`These markets were initialized with past dates and cannot accept bets.`);
  console.log(`Users should bet on markets with valid future end dates only.`);
  console.log('\n✨ Done!');
}

// Run the script
updateMarketDates().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
