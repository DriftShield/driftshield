/**
 * Script to initialize all Polymarket markets on-chain
 * Run with: npx ts-node scripts/initialize-markets.ts
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { initializeMarket } from '../lib/solana/prediction-bets';
import * as fs from 'fs';

// Configuration
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const POLYMARKET_API = 'https://gamma-api.polymarket.com';

interface PolymarketMarket {
  id: string;
  question: string;
  endDate: string;
  active: boolean;
  closed: boolean;
}

async function fetchPolymarketMarkets(limit: number = 100, offset: number = 0): Promise<PolymarketMarket[]> {
  try {
    // Fetch active markets with future end dates only
    const response = await fetch(
      `${POLYMARKET_API}/markets?limit=${limit}&offset=${offset}&closed=false&active=true`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch markets: ${response.statusText}`);
    }

    const data = await response.json();

    // Filter for active markets only (keep markets with null end dates)
    return data.filter((m: PolymarketMarket) => !m.closed && m.active);
  } catch (error) {
    console.error('Error fetching Polymarket markets:', error);
    return [];
  }
}

async function initializeAllMarkets() {
  console.log('🚀 Starting market initialization...\n');

  // Load wallet keypair from environment or file
  const keypairPath = process.env.SOLANA_KEYPAIR_PATH || '/Users/ramsis/.config/solana/id.json';

  if (!fs.existsSync(keypairPath)) {
    console.error('❌ Keypair not found at:', keypairPath);
    console.error('Set SOLANA_KEYPAIR_PATH environment variable or ensure keypair exists');
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

  if (balance < 1e9) {
    console.error('❌ Insufficient balance. Need at least 1 SOL for initialization.');
    console.error('Run: solana airdrop 2');
    process.exit(1);
  }

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

  // Fetch markets from Polymarket - offset to get different markets
  console.log('📊 Fetching markets from Polymarket...');
  const markets = await fetchPolymarketMarkets(100, 100); // Offset 100 to get next batch
  console.log(`Found ${markets.length} markets (offset 100)\n`);

  if (markets.length === 0) {
    console.log('No markets to initialize.');
    return;
  }

  let successCount = 0;
  let errorCount = 0;
  const errors: { market: string; error: string }[] = [];

  // Initialize each market
  for (let i = 0; i < markets.length; i++) {
    const market = markets[i];

    try {
      console.log(`\n🔄 [${i + 1}/${markets.length}] Initializing: ${market.question.slice(0, 60)}...`);

      // Use the actual end date from Polymarket, or 1 year from now if null
      let endTimestamp: number;
      if (market.endDate) {
        const marketEndDate = new Date(market.endDate).getTime();
        const now = Date.now();

        // If market has expired, set end date to 1 year from now
        if (marketEndDate < now) {
          console.log(`  ⚠️  Market expired (${new Date(market.endDate).toLocaleDateString()}), setting to 1 year from now`);
          endTimestamp = Math.floor(now / 1000) + (365 * 24 * 60 * 60);
        } else {
          console.log(`  ✅ Using Polymarket end date: ${new Date(market.endDate).toLocaleDateString()}`);
          endTimestamp = Math.floor(marketEndDate / 1000);
        }
      } else {
        // If no end date provided, default to 1 year from now
        console.log(`  ⚠️  No end date, setting to 1 year from now`);
        endTimestamp = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      }

      // Initialize market on-chain
      const signature = await initializeMarket(
        connection,
        wallet as any,
        market.id,
        market.question.slice(0, 200), // Limit to 200 chars (Solana account size limit)
        endTimestamp
      );

      console.log(`✅ Success! Tx: ${signature}`);
      successCount++;

      // Rate limiting - wait 1 second between transactions to avoid overwhelming the RPC
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      console.error(`❌ Failed:`, error.message);
      errorCount++;
      errors.push({
        market: market.question.slice(0, 60),
        error: error.message,
      });

      // Continue with next market even if one fails
      continue;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📈 INITIALIZATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📊 Total processed: ${successCount + errorCount}`);
  console.log(`⏭️  Skipped: ${markets.length - successCount - errorCount}`);

  if (errors.length > 0) {
    console.log('\n❌ ERRORS:');
    errors.forEach(({ market, error }) => {
      console.log(`  - ${market}: ${error}`);
    });
  }

  console.log('\n✨ Done!');
}

// Run the script
initializeAllMarkets().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
