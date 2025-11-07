/**
 * Script to check the actual market_id stored in a market account
 * Helps diagnose ConstraintSeeds errors
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import IDL from '../lib/solana/prediction_bets_idl.json';

const PROGRAM_ID = new PublicKey('HS4Sux4XfwQfEqDpVGXXbfQV85NzwTKXdUHu55HFsduz');
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

async function main() {
  const marketIdToCheck = process.argv[2] || 'soccer-worldcup-84';

  console.log(`\n🔍 Checking market: ${marketIdToCheck}\n`);

  const connection = new Connection(RPC_URL, 'confirmed');

  // Try to derive the PDA using the market_id
  const [marketPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), Buffer.from(marketIdToCheck)],
    PROGRAM_ID
  );

  console.log(`Expected PDA: ${marketPDA.toBase58()}`);
  console.log(`Expected bump: ${bump}\n`);

  // Try to fetch the account
  try {
    const accountInfo = await connection.getAccountInfo(marketPDA);

    if (!accountInfo) {
      console.log('❌ Market account not found at this address');
      console.log('This means the market was never created with this market_id\n');
      return;
    }

    console.log('✅ Market account found!');
    console.log(`   Owner: ${accountInfo.owner.toBase58()}`);
    console.log(`   Lamports: ${accountInfo.lamports}`);
    console.log(`   Data length: ${accountInfo.data.length}\n`);

    // Try to decode using Anchor
    const { BorshAccountsCoder } = await import('@coral-xyz/anchor');
    const coder = new BorshAccountsCoder(IDL as any);

    try {
      const marketData = coder.decode('Market', accountInfo.data) as any;

      console.log('📊 Market Data:');
      console.log(`   Stored market_id: "${marketData.market_id}"`);
      console.log(`   Title: "${marketData.title}"`);
      console.log(`   Authority: ${marketData.authority.toBase58()}`);
      console.log(`   Num outcomes: ${marketData.num_outcomes}`);
      console.log(`   Outcome labels:`, marketData.outcome_labels.filter((l: string) => l.length > 0));
      console.log(`   End timestamp: ${new Date(marketData.end_timestamp.toNumber() * 1000).toLocaleString()}`);
      console.log(`   Bump: ${marketData.bump}`);
      console.log(`   Is resolved: ${marketData.is_resolved}\n`);

      // Check if the stored market_id matches
      if (marketData.market_id === marketIdToCheck) {
        console.log('✅ Market ID matches! This market should work correctly.');
      } else {
        console.log(`⚠️  WARNING: Market ID mismatch!`);
        console.log(`   You're trying to use: "${marketIdToCheck}"`);
        console.log(`   But the market was created with: "${marketData.market_id}"`);
        console.log(`   This will cause ConstraintSeeds errors!`);
        console.log(`\n   To fix: Use market_id="${marketData.market_id}" instead\n`);
      }

      // Try to recalculate the PDA with the stored market_id
      if (marketData.market_id !== marketIdToCheck) {
        const [correctPDA, correctBump] = PublicKey.findProgramAddressSync(
          [Buffer.from('market'), Buffer.from(marketData.market_id)],
          PROGRAM_ID
        );
        console.log(`✅ Correct PDA for stored market_id: ${correctPDA.toBase58()}`);
        console.log(`   Bump: ${correctBump}\n`);
      }

    } catch (decodeError: any) {
      console.error('❌ Failed to decode market data:', decodeError.message);
    }

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);
