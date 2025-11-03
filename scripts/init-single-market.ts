/**
 * Quick script to initialize a single market
 * Usage: npx ts-node scripts/init-single-market.ts <market-id>
 */

import { Connection, Keypair } from '@solana/web3.js';
import { initializeMarket } from '../lib/solana/prediction-bets';
import * as fs from 'fs';

const marketId = process.argv[2];

if (!marketId) {
  console.error('❌ Usage: npx ts-node scripts/init-single-market.ts <market-id>');
  console.error('Example: npx ts-node scripts/init-single-market.ts 0x123abc...');
  process.exit(1);
}

async function initializeSingleMarket() {
  console.log(`🚀 Initializing market: ${marketId}\n`);

  const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const keypairPath = process.env.SOLANA_KEYPAIR_PATH || '/Users/ramsis/.config/solana/id.json';

  // Load keypair
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log('💼 Wallet:', keypair.publicKey.toString());

  // Create connection
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

  // Create wallet adapter
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

  // Fetch market details from Polymarket
  console.log('📊 Fetching market details from Polymarket...');
  const response = await fetch(`https://gamma-api.polymarket.com/markets/${marketId}`);

  if (!response.ok) {
    throw new Error('Market not found on Polymarket');
  }

  const market = await response.json();
  console.log('📝 Market:', market.question);
  console.log('📅 End date:', market.end_date_iso);

  const endTimestamp = Math.floor(new Date(market.end_date_iso).getTime() / 1000);

  // Initialize on-chain
  console.log('\n🔄 Initializing on Solana...');
  const signature = await initializeMarket(
    connection,
    wallet as any,
    market.id,
    market.question.slice(0, 200),
    endTimestamp
  );

  console.log(`\n✅ Success!`);
  console.log(`📝 Transaction: https://solscan.io/tx/${signature}?cluster=devnet`);
}

initializeSingleMarket().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
