import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import IDL from './lib/solana/prediction_bets_idl.json';
import { PROGRAM_ID } from './lib/solana/prediction-bets';

const SOLANA_RPC_URL = 'https://api.devnet.solana.com';

async function checkMarkets() {
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  
  const dummyWallet = {
    publicKey: PROGRAM_ID,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };
  
  const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' });
  const program = new Program(IDL as any, provider);
  
  const accounts = await program.account.market.all();
  
  console.log(`\nFound ${accounts.length} markets on-chain\n`);
  
  const limit = Math.min(10, accounts.length);
  for (let i = 0; i < limit; i++) {
    const marketData = accounts[i].account as any;
    const endTimestamp = marketData.endTimestamp.toNumber();
    const endDate = new Date(endTimestamp * 1000);
    const now = new Date();
    const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const titleShort = marketData.title.substring(0, 50);
    console.log(`${i + 1}. ${titleShort}`);
    console.log(`   End Date: ${endDate.toLocaleDateString()} (${daysUntilEnd} days from now)`);
    console.log('');
  }
}

checkMarkets();
