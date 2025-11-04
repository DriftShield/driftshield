import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, BorshAccountsCoder } from '@coral-xyz/anchor';
import IDL from '../lib/solana/prediction_bets_idl.json';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('BQtqZ6H72cbMjmSzm6Bv5zKYBF9a6ZwCnbZJNYWNK1xj');

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');

  const dummyWallet = {
    publicKey: PROGRAM_ID,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };

  const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' });
  const program = new Program(IDL as any, provider);

  console.log('Program ID:', PROGRAM_ID.toBase58());
  console.log('IDL version:', (IDL as any).metadata?.version);
  console.log('IDL address:', (IDL as any).address);

  // Check the Market account discriminator in the IDL
  const marketAccount = (IDL as any).accounts.find((a: any) => a.name === 'Market');
  console.log('\nMarket discriminator from IDL:', marketAccount?.discriminator);

  const programAccounts = await connection.getProgramAccounts(PROGRAM_ID);
  const limitedAccounts = programAccounts.slice(0, 5);
  console.log(`\nFound ${programAccounts.length} accounts total, checking first 5`);

  for (let i = 0; i < limitedAccounts.length; i++) {
    const { pubkey, account } = limitedAccounts[i];
    console.log(`\nAccount ${i + 1}: ${pubkey.toBase58()}`);
    console.log(`  Size: ${account.data.length} bytes`);
    console.log(`  Discriminator: ${Array.from(account.data.slice(0, 8))}`);

    try {
      const marketData = program.coder.accounts.decode('Market', account.data);
      console.log(`  ✓ Successfully decoded as Market!`);
      console.log(`    Market ID: ${marketData.marketId}`);
      console.log(`    Title: ${marketData.title.substring(0, 50)}`);
      console.log(`    Num outcomes: ${marketData.numOutcomes}`);
      console.log(`    Resolution status: ${JSON.stringify(marketData.resolutionStatus)}`);
    } catch (e: any) {
      console.log(`  ✗ Failed to decode: ${e.message.substring(0, 100)}`);

      // Try manual decoding
      try {
        const coder = new BorshAccountsCoder(IDL as any);
        const decoded = coder.decode('Market', account.data);
        console.log(`  Manual decode succeeded:`, decoded);
      } catch (e2: any) {
        console.log(`  Manual decode also failed: ${e2.message.substring(0, 100)}`);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
