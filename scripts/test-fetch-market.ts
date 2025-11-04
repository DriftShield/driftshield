import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
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

  console.log('Fetching all program accounts...');
  const programAccounts = await connection.getProgramAccounts(PROGRAM_ID);
  console.log(`Found ${programAccounts.length} total accounts`);

  console.log('\nFirst 5 account sizes:');
  for (let i = 0; i < Math.min(5, programAccounts.length); i++) {
    const { pubkey, account } = programAccounts[i];
    console.log(`  ${pubkey.toBase58()}: ${account.data.length} bytes`);
    console.log(`    First 8 bytes (discriminator): ${Array.from(account.data.slice(0, 8)).join(',')}`);
  }

  console.log('\nAttempting to decode accounts as Market...');
  let marketCount = 0;
  let betCount = 0;
  let vaultCount = 0;
  let unknownCount = 0;

  for (const { pubkey, account } of programAccounts) {
    const discriminator = Array.from(account.data.slice(0, 8));

    try {
      const marketData = program.coder.accounts.decode('Market', account.data);
      console.log(`✓ Market found: ${marketData.marketId} - ${marketData.title.substring(0, 50)}`);
      marketCount++;
      if (marketCount >= 5) break; // Stop after finding 5 markets
    } catch (e1) {
      try {
        const betData = program.coder.accounts.decode('Bet', account.data);
        betCount++;
      } catch (e2) {
        try {
          const vaultData = program.coder.accounts.decode('Vault', account.data);
          vaultCount++;
        } catch (e3) {
          unknownCount++;
        }
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Markets: ${marketCount}`);
  console.log(`Bets: ${betCount}`);
  console.log(`Vaults: ${vaultCount}`);
  console.log(`Unknown: ${unknownCount}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
