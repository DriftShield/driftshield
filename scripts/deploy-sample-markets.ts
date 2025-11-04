import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { initializeMarket } from '../lib/solana/prediction-bets';
import fs from 'fs';
import path from 'path';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

interface SampleMarket {
  marketId: string;
  title: string;
  outcomes: string[];
  daysUntilEnd: number;
}

const SAMPLE_MARKETS: SampleMarket[] = [
  // Binary markets
  {
    marketId: 'btc-100k-2025',
    title: 'Will Bitcoin reach $100,000 by end of 2025?',
    outcomes: ['Yes', 'No'],
    daysUntilEnd: 365
  },
  {
    marketId: 'eth-5k-2025',
    title: 'Will Ethereum reach $5,000 by end of 2025?',
    outcomes: ['Yes', 'No'],
    daysUntilEnd: 365
  },
  {
    marketId: 'sol-500-2025',
    title: 'Will Solana reach $500 by end of 2025?',
    outcomes: ['Yes', 'No'],
    daysUntilEnd: 365
  },
  {
    marketId: 'ai-agi-2026',
    title: 'Will AGI (Artificial General Intelligence) be achieved by 2026?',
    outcomes: ['Yes', 'No'],
    daysUntilEnd: 730
  },
  {
    marketId: 'spacex-mars-2026',
    title: 'Will SpaceX land humans on Mars by 2026?',
    outcomes: ['Yes', 'No'],
    daysUntilEnd: 730
  },

  // Multi-outcome markets
  {
    marketId: 'us-election-2024',
    title: 'Who will win the 2024 US Presidential Election?',
    outcomes: ['Trump', 'Biden', 'Kennedy', 'Other'],
    daysUntilEnd: 30
  },
  {
    marketId: 'next-fed-rate',
    title: 'What will be the next Fed rate decision?',
    outcomes: ['Raise 0.25%', 'Raise 0.50%', 'Hold', 'Cut 0.25%', 'Cut 0.50%'],
    daysUntilEnd: 45
  },
  {
    marketId: 'crypto-winner-2025',
    title: 'Which crypto will have the best performance in 2025?',
    outcomes: ['Bitcoin', 'Ethereum', 'Solana', 'Cardano', 'Polkadot', 'Avalanche'],
    daysUntilEnd: 365
  },
  {
    marketId: 'ai-company-leader',
    title: 'Which company will lead in AI by end of 2025?',
    outcomes: ['OpenAI', 'Google', 'Anthropic', 'Meta', 'Microsoft'],
    daysUntilEnd: 365
  },
  {
    marketId: 'nfl-superbowl-2025',
    title: 'Who will win Super Bowl 2025?',
    outcomes: ['Chiefs', '49ers', 'Ravens', 'Bills', 'Eagles', 'Cowboys', 'Other'],
    daysUntilEnd: 90
  }
];

async function loadWallet(): Promise<Keypair> {
  const possiblePaths = [
    process.env.SOLANA_WALLET_PATH,
    path.join(process.env.HOME!, '.config/solana/id.json'),
    path.join(process.env.HOME!, '.config/solana/devnet.json'),
  ].filter(Boolean);

  for (const walletPath of possiblePaths) {
    try {
      if (fs.existsSync(walletPath!)) {
        const secretKey = JSON.parse(fs.readFileSync(walletPath!, 'utf-8'));
        const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
        console.log(`✓ Loaded wallet: ${keypair.publicKey.toBase58()}`);
        return keypair;
      }
    } catch (error) {
      continue;
    }
  }

  throw new Error('No wallet found. Set SOLANA_WALLET_PATH or create ~/.config/solana/id.json');
}

async function deployMarket(
  connection: Connection,
  wallet: Wallet,
  market: SampleMarket
): Promise<string> {
  const endTimestamp = Math.floor(Date.now() / 1000) + (market.daysUntilEnd * 24 * 60 * 60);

  const signature = await initializeMarket(
    connection,
    {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction.bind(wallet),
      signAllTransactions: wallet.signAllTransactions.bind(wallet),
      connected: true
    } as any,
    market.marketId,
    market.title,
    market.outcomes,
    endTimestamp,
    undefined
  );

  return signature;
}

async function main() {
  console.log('=== Sample Market Deployment ===\n');

  const connection = new Connection(RPC_URL, 'confirmed');
  const keypair = await loadWallet();
  const wallet = new Wallet(keypair);

  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Wallet balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n`);

  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.warn('⚠️  Low balance. Get devnet SOL from: https://faucet.solana.com/\n');
  }

  let deployed = 0;
  let failed = 0;

  for (let i = 0; i < SAMPLE_MARKETS.length; i++) {
    const market = SAMPLE_MARKETS[i];

    console.log(`[${i + 1}/${SAMPLE_MARKETS.length}] 📤 Deploying: ${market.title.substring(0, 60)}...`);
    console.log(`   Market ID: ${market.marketId}`);
    console.log(`   Outcomes: ${market.outcomes.join(', ')}`);
    console.log(`   Ends in: ${market.daysUntilEnd} days`);

    try {
      const signature = await deployMarket(connection, wallet, market);
      console.log(`   ✅ Deployed! TX: ${signature}\n`);
      deployed++;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      if (error.message.includes('already in use')) {
        console.log(`   ⏭️  Already exists, skipping\n`);
      } else {
        console.error(`   ❌ Failed: ${error.message}\n`);
        failed++;

        if (error.message.includes('insufficient funds')) {
          console.error('⛔ Insufficient funds. Stopping deployment.');
          break;
        }
      }
    }
  }

  console.log('\n=== Deployment Summary ===');
  console.log(`Total markets: ${SAMPLE_MARKETS.length}`);
  console.log(`Successfully deployed: ${deployed}`);
  console.log(`Failed: ${failed}`);
  console.log(`\n✅ Done! Visit http://localhost:3000/dashboard/markets to see your markets`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
