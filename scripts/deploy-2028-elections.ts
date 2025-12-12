import { Connection, Keypair } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { initializeMarket } from '../lib/solana/prediction-bets';
import fs from 'fs';
import path from 'path';

const POLYMARKET_API_BASE = 'https://gamma-api.polymarket.com';
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

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
        return Keypair.fromSecretKey(new Uint8Array(secretKey));
      }
    } catch (error) {
      continue;
    }
  }
  throw new Error('No wallet found');
}

async function deployElectionMarket(
  connection: Connection,
  wallet: Wallet,
  eventId: string
) {
  // Fetch event from Polymarket
  const response = await fetch(`${POLYMARKET_API_BASE}/events/${eventId}`);
  const event = await response.json();

  console.log(`\nEvent: ${event.title}`);
  console.log(`Total markets: ${event.markets.length}`);

  // Extract candidate names from first 10 markets (Polymarket orders by volume/probability)
  const outcomes = event.markets.slice(0, 10).map((m: any) => {
    const question = m.question;

    // Match patterns like "Will X win the 2028"
    const patterns = [
      /Will ([A-Z][a-z]+ [A-Z][a-z]+) win/i,  // "Will Donald Trump win"
      /Will ([A-Z][a-z]+) win/i,               // "Will Trump win"
      /Will Person ([A-Z]+) win/i,             // "Will Person A win"
      /Will another .+ win/i,                  // "Will another person win"
    ];

    for (const pattern of patterns) {
      const match = question.match(pattern);
      if (match) {
        if (match[1]) {
          return match[1];
        }
        if (question.includes('another')) {
          return 'Other';
        }
      }
    }

    // Fallback
    return question.split(' ').slice(1, 3).join(' ').replace(/\?/g, '').trim();
  });

  // Sort alphabetically
  outcomes.sort((a: string, b: string) => a.localeCompare(b));

  console.log(`Top 10 outcomes: ${outcomes.join(', ')}`);

  const endDateStr = event.markets[0].endDate || event.endDate;
  const endTimestamp = Math.floor(new Date(endDateStr).getTime() / 1000);
  console.log(`End date: ${new Date(endTimestamp * 1000).toLocaleDateString()}`);

  const marketId = `pm-multi-${eventId}`;
  console.log(`\nDeploying ${marketId}...`);

  try {
    const signature = await initializeMarket(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction.bind(wallet),
        signAllTransactions: wallet.signAllTransactions.bind(wallet),
        connected: true
      } as any,
      marketId,
      event.title,
      outcomes,
      endTimestamp,
      undefined
    );

    console.log(`✅ Deployed! TX: ${signature}`);
    return true;
  } catch (error: any) {
    if (error.message?.includes('custom program error: 0x0') || error.message?.includes('already in use')) {
      console.log('⚠️  Market already exists');
      return true;
    } else {
      console.error(`❌ Failed: ${error.message}`);
      return false;
    }
  }
}

async function main() {
  console.log('=== Deploying 2028 Election Markets ===\n');

  const connection = new Connection(RPC_URL, 'confirmed');
  const keypair = await loadWallet();
  const wallet = new Wallet(keypair);

  const electionEvents = [
    '30829', // Democratic Presidential Nominee 2028
    '31552', // Presidential Election Winner 2028
    '31875', // Republican Presidential Nominee 2028
  ];

  for (const eventId of electionEvents) {
    await deployElectionMarket(connection, wallet, eventId);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ All 2028 election markets deployed!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
