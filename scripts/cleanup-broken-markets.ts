/**
 * Script to identify and close broken markets on-chain
 * Markets with constraint seeds errors cannot accept bets
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';
import IDL from '../lib/solana/prediction_bets_idl.json';

const PROGRAM_ID = new PublicKey('BQtqZ6H72cbMjmSzm6Bv5zKYBF9a6ZwCnbZJNYWNK1xj');
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

async function main() {
  console.log('🔍 Scanning for broken markets...\n');

  // Load wallet
  const keypairPath = process.env.SOLANA_KEYPAIR_PATH ||
                      path.join(process.env.HOME || '', '.config/solana/id.json');

  if (!fs.existsSync(keypairPath)) {
    throw new Error(`Keypair not found at ${keypairPath}. Set SOLANA_KEYPAIR_PATH environment variable.`);
  }

  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  const wallet = new Wallet(keypair);

  console.log(`📍 Using wallet: ${wallet.publicKey.toBase58()}`);
  console.log(`📍 Network: ${RPC_URL}\n`);

  const connection = new Connection(RPC_URL, 'confirmed');
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(IDL as any, provider);

  // Get all program accounts
  const programAccounts = await connection.getProgramAccounts(PROGRAM_ID);
  console.log(`Found ${programAccounts.length} total program accounts\n`);

  const { BorshAccountsCoder } = await import('@coral-xyz/anchor');
  const coder = new BorshAccountsCoder(IDL as any);

  const markets: Array<{ pubkey: PublicKey; marketId: string; title: string }> = [];

  // Decode market accounts
  for (const { pubkey, account } of programAccounts) {
    try {
      if (account.data.length < 8) continue;

      const marketData = coder.decode('Market', account.data) as any;

      markets.push({
        pubkey,
        marketId: marketData.market_id,
        title: marketData.title,
      });
    } catch (err) {
      // Skip non-market accounts
      continue;
    }
  }

  console.log(`📊 Found ${markets.length} markets on-chain\n`);
  console.log('Market IDs:', markets.map(m => m.marketId).join(', '));
  console.log('\n');

  // Ask user what to do
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    readline.question(
      `Do you want to:\n` +
      `1. Close ALL markets (delete everything)\n` +
      `2. List market details only (no changes)\n` +
      `3. Exit\n\n` +
      `Enter choice (1/2/3): `,
      resolve
    );
  });

  readline.close();

  if (answer === '1') {
    console.log('\n⚠️  WARNING: This will close ALL markets on-chain!');
    console.log('This action cannot be undone.\n');

    const confirm = await new Promise<string>((resolve) => {
      const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question('Type "DELETE ALL" to confirm: ', (ans: string) => {
        rl.close();
        resolve(ans);
      });
    });

    if (confirm === 'DELETE ALL') {
      console.log('\n🗑️  Closing all markets...\n');

      // Note: There's no close_market instruction in the current program
      // We would need to add one to the Solana program first
      console.log('❌ ERROR: The Solana program does not have a close_market instruction.');
      console.log('To remove markets, you need to:');
      console.log('1. Add a close_market instruction to the Solana program');
      console.log('2. Redeploy the program');
      console.log('3. Run this script again');
      console.log('\nAlternatively, you can:');
      console.log('- Just create new markets and ignore the old ones');
      console.log('- The redirect will handle when users visit broken markets');
    } else {
      console.log('\n❌ Aborted. No changes made.');
    }
  } else if (answer === '2') {
    console.log('\n📋 Market Details:\n');
    for (const market of markets.slice(0, 20)) {
      console.log(`- ${market.marketId}: "${market.title}"`);
    }
    if (markets.length > 20) {
      console.log(`\n... and ${markets.length - 20} more markets`);
    }
  } else {
    console.log('\n👋 Exiting without changes.');
  }
}

main().catch(console.error);
