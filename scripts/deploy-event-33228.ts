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

async function main() {
  const eventId = '33228';

  // Fetch event from Polymarket
  const response = await fetch(`${POLYMARKET_API_BASE}/events/${eventId}`);
  const event = await response.json();

  console.log(`Event: ${event.title}`);
  console.log(`Markets: ${event.markets.length}`);

  // Extract party names from questions
  const outcomes = event.markets.map((m: any) => {
    const question = m.question;

    // Match patterns like "Will the Democrats win" or "Will Party A win"
    const match = question.match(/Will (?:the )?(\w+(?:\s+\w+)?) win/i);
    if (match && match[1]) {
      return match[1];
    }

    // Handle "another party"
    if (question.includes('another party')) {
      return 'Other';
    }

    // Fallback
    return question.split(' ').slice(1, 3).join(' ');
  }).slice(0, 10); // Max 10 outcomes

  // Sort: numbers first (numerically), then alphabetically
  outcomes.sort((a: string, b: string) => {
    const aNum = parseFloat(a.replace('+', ''));
    const bNum = parseFloat(b.replace('+', ''));
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    if (!isNaN(aNum)) return -1;
    if (!isNaN(bNum)) return 1;
    return a.localeCompare(b);
  });

  console.log(`Outcomes (${outcomes.length}): ${outcomes.join(', ')}`);

  const endDateStr = event.markets[0].endDate || event.endDate;
  const endTimestamp = Math.floor(new Date(endDateStr).getTime() / 1000);

  console.log(`End date: ${new Date(endTimestamp * 1000).toLocaleDateString()}`);

  // Setup
  const connection = new Connection(RPC_URL, 'confirmed');
  const keypair = await loadWallet();
  const wallet = new Wallet(keypair);

  console.log(`\nDeploying market pm-multi-${eventId}...`);

  try {
    const signature = await initializeMarket(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction.bind(wallet),
        signAllTransactions: wallet.signAllTransactions.bind(wallet),
        connected: true
      } as any,
      `pm-multi-${eventId}`,
      event.title,
      outcomes,
      endTimestamp,
      undefined
    );

    console.log(`✅ Deployed! TX: ${signature}`);
  } catch (error: any) {
    if (error.message?.includes('already in use') || error.message?.includes('custom program error: 0x0')) {
      console.log('⚠️  Market already exists');
    } else {
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
