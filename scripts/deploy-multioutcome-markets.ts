/**
 * Deploy multi-outcome markets from Polymarket API to Solana
 * Multi-outcome markets are events with multiple sub-markets
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';
import { initializeMarket, getMarketPDA } from '../lib/solana/prediction-bets';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

interface PolymarketMarket {
  question: string;
  outcomes: string | string[];
}

interface PolymarketEvent {
  id: string;
  title: string;
  description?: string;
  endDate: string;
  markets: PolymarketMarket[];
}

/**
 * Extract outcome label from market question
 * E.g., "Will 3 Fed rate cuts happen in 2025?" -> "3"
 */
function extractOutcomeFromQuestion(question: string, eventTitle: string): string {
  // Try to extract number patterns
  const numberMatch = question.match(/(\d+\+?|\d+-\d+|no|none|zero)/i);
  if (numberMatch) {
    return numberMatch[1];
  }

  // Try to extract name patterns (for CEO, country lists, etc)
  // "Tim Cook out as Apple CEO in 2025?" -> "Tim Cook (Apple)"
  const nameMatch = question.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    // Try to extract company/context
    const contextMatch = question.match(/(?:as|at|from)\s+([A-Z][a-z]+)/);
    if (contextMatch) {
      return `${name} (${contextMatch[1]})`;
    }
    return name;
  }

  // Try to extract movie/product names in quotes
  const quotesMatch = question.match(/"([^"]+)"/);
  if (quotesMatch) {
    return quotesMatch[1];
  }

  // Fallback: extract key words between "Will" and "?"
  const fallbackMatch = question.match(/Will\s+(.+?)\s+(?:happen|occur|win|be)/i);
  if (fallbackMatch) {
    return fallbackMatch[1].trim();
  }

  // Last resort: use first few words
  return question.split(/\?|in 2025/)[0].replace(/^Will\s+/i, '').trim().substring(0, 30);
}

async function fetchMultiOutcomeMarkets(limit: number): Promise<PolymarketEvent[]> {
  try {
    const response = await fetch(`https://gamma-api.polymarket.com/events?limit=500&closed=false`);
    const allEvents: PolymarketEvent[] = await response.json();

    console.log(`📊 API returned ${allEvents.length} events`);

    const now = Date.now() / 1000;
    let filtered = 0;
    let tooFew = 0;
    let tooMany = 0;
    let expired = 0;

    const multiOutcomeEvents = allEvents.filter((event: PolymarketEvent) => {
      if (!event.markets || event.markets.length <= 1) {
        tooFew++;
        return false;
      }

      if (event.markets.length > 10) {
        tooMany++;
        return false;
      }

      const endTimestamp = Math.floor(new Date(event.endDate).getTime() / 1000);
      if (isNaN(endTimestamp) || endTimestamp <= now) {
        expired++;
        return false;
      }

      return true;
    }).slice(0, limit);

    console.log(`🔍 Filtering results:`);
    console.log(`   - Too few markets (≤1): ${tooFew}`);
    console.log(`   - Too many markets (>10): ${tooMany}`);
    console.log(`   - Expired: ${expired}`);
    console.log(`   - Valid multi-outcome events: ${multiOutcomeEvents.length}`);

    console.log(`✅ Filtered to ${multiOutcomeEvents.length} deployable multi-outcome markets\n`);
    return multiOutcomeEvents;
  } catch (error) {
    console.error('Error fetching from Polymarket:', error);
    throw error;
  }
}

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
  marketId: string,
  title: string,
  outcomes: string[],
  endTimestamp: number
): Promise<string> {
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
      title,
      outcomes,
      endTimestamp,
      undefined
    );

    return signature;
  } catch (error: any) {
    throw new Error(`Deployment failed: ${error.message}`);
  }
}

async function main() {
  console.log('=== Multi-Outcome Market Deployment from Polymarket ===\n');

  const args = process.argv.slice(2);
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 50;
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No transactions will be sent\n');
  }

  const connection = new Connection(RPC_URL, 'confirmed');
  const keypair = await loadWallet();
  const wallet = new Wallet(keypair);

  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Wallet balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

  if (balance < 0.5 * LAMPORTS_PER_SOL) {
    console.warn('⚠️  Warning: Low balance. You need ~0.02 SOL per market for rent.');
  }
  console.log('');

  const events = await fetchMultiOutcomeMarkets(limit);
  console.log('');

  let deployed = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const marketId = `pm-multi-${event.id}`;
    const title = event.title.substring(0, 200);

    // Extract outcome labels from market questions
    const outcomes = event.markets.map(market =>
      extractOutcomeFromQuestion(market.question, event.title)
    );

    const endTimestamp = Math.floor(new Date(event.endDate).getTime() / 1000);

    console.log(`[${i + 1}/${events.length}] 📤 Deploying: ${title.substring(0, 60)}...`);
    console.log(`   Market ID: ${marketId}`);
    console.log(`   Outcomes (${outcomes.length}): ${outcomes.join(', ')}`);
    console.log(`   Ends: ${new Date(endTimestamp * 1000).toLocaleDateString()}`);

    if (dryRun) {
      console.log(`   🔍 DRY RUN - Would deploy here\n`);
      continue;
    }

    try {
      // Check if market already exists
      const [marketPDA] = getMarketPDA(marketId);
      const accountInfo = await connection.getAccountInfo(marketPDA);

      if (accountInfo) {
        console.log(`   ⚠️  Already exists, skipping...\n`);
        skipped++;
        continue;
      }

      const signature = await deployMarket(
        connection,
        wallet,
        marketId,
        title,
        outcomes,
        endTimestamp
      );

      console.log(`   ✅ Deployed! TX: ${signature}\n`);
      deployed++;

      // Rate limit: wait 500ms between deployments
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}\n`);
      failed++;

      if (error.message.includes('insufficient')) {
        console.log('⛔ Ran out of SOL, stopping deployment...\n');
        break;
      }
    }
  }

  console.log('\n=== Deployment Summary ===');
  console.log(`✅ Successfully deployed: ${deployed}`);
  console.log(`⚠️  Skipped (already exist): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total processed: ${deployed + skipped + failed}/${events.length}`);

  const finalBalance = await connection.getBalance(wallet.publicKey);
  console.log(`\n💰 Final balance: ${(finalBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`💸 Total spent: ${((balance - finalBalance) / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
}

main().catch(console.error);
