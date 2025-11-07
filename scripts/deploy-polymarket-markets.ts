import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { initializeMarket } from '../lib/solana/prediction-bets';
import fs from 'fs';
import path from 'path';

const POLYMARKET_API_BASE = 'https://gamma-api.polymarket.com';
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

interface PolymarketEvent {
  id: string;
  title: string;
  description: string;
  endDate: string;
  markets: Array<{
    question: string;
    outcomes: string | string[];
    endDate?: string;
  }>;
}

async function fetchPolymarketMarkets(limit: number = 300): Promise<PolymarketEvent[]> {
  console.log(`📡 Fetching ${limit} non-expired markets from Polymarket...`);

  try {
    // Fetch more to filter for suitable ones
    const fetchLimit = Math.min(limit * 5, 1000);
    const response = await fetch(`${POLYMARKET_API_BASE}/events?limit=${fetchLimit}&active=true&closed=false`);

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.statusText}`);
    }

    const allEvents = await response.json();

    console.log(`📊 API returned ${allEvents.length} events`);
    console.log(`📝 Sample event structure:`, JSON.stringify(allEvents[0], null, 2).slice(0, 500));

    // Filter for markets with 2-10 outcomes that haven't ended
    const now = Date.now() / 1000;
    let noMarkets = 0;
    let expired = 0;
    let tooManyOutcomes = 0;
    let invalidDate = 0;

    const events = allEvents.filter((event: PolymarketEvent) => {
      if (!event.markets || event.markets.length === 0) {
        noMarkets++;
        return false;
      }
      const market = event.markets[0];
      // Try market.endDate first, then event.endDate
      const endDateStr = market.endDate || event.endDate;
      const endTimestamp = Math.floor(new Date(endDateStr).getTime() / 1000);

      // Parse outcomes - could be string or array
      let outcomes: string[];
      if (typeof market.outcomes === 'string') {
        try {
          outcomes = JSON.parse(market.outcomes);
        } catch {
          outcomes = ['Yes', 'No'];
        }
      } else if (Array.isArray(market.outcomes)) {
        outcomes = market.outcomes;
      } else {
        outcomes = ['Yes', 'No'];
      }

      if (isNaN(endTimestamp)) {
        invalidDate++;
        return false;
      }

      if (endTimestamp <= now) {
        expired++;
        return false;
      }

      if (outcomes.length < 2 || outcomes.length > 10) {
        tooManyOutcomes++;
        return false;
      }

      return true;
    }).slice(0, limit);

    console.log(`🔍 Filtering results:`);
    console.log(`   - No markets: ${noMarkets}`);
    console.log(`   - Expired: ${expired}`);
    console.log(`   - Invalid dates: ${invalidDate}`);
    console.log(`   - Too many/few outcomes: ${tooManyOutcomes}`);
    console.log(`   - Valid markets: ${events.length}`);

    console.log(`✅ Fetched ${allEvents.length} total, filtered to ${events.length} deployable non-expired markets`);
    return events;
  } catch (error) {
    console.error('Error fetching from Polymarket:', error);
    throw error;
  }
}

async function loadWallet(): Promise<Keypair> {
  // Try to load wallet from various locations
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
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });

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
      undefined // no oracle feed
    );

    return signature;
  } catch (error: any) {
    throw new Error(`Deployment failed: ${error.message}`);
  }
}

async function main() {
  console.log('=== Polymarket to Solana Market Deployment ===\n');

  // Parse command line args
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 300;
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No transactions will be sent\n');
  }

  // Setup connection and wallet
  const connection = new Connection(RPC_URL, 'confirmed');
  const keypair = await loadWallet();
  const wallet = new Wallet(keypair);

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Wallet balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.warn('⚠️  Warning: Low balance. You need ~0.02 SOL per market for rent.');
  }
  console.log('');

  // Fetch markets
  const events = await fetchPolymarketMarkets(limit);
  console.log('');

  // Process markets
  let deployed = 0;
  let failed = 0;
  const results: Array<{ marketId: string; status: string; signature?: string; error?: string }> = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Skip events without markets
    if (!event.markets || event.markets.length === 0) {
      continue;
    }

    // Use the first market from the event
    const market = event.markets[0];
    const marketId = `pm-${event.id}`;
    const title = event.title.substring(0, 200); // Limit to 200 chars

    // Parse outcomes
    let outcomes: string[];
    if (typeof market.outcomes === 'string') {
      try {
        outcomes = JSON.parse(market.outcomes);
      } catch {
        outcomes = ['Yes', 'No'];
      }
    } else if (Array.isArray(market.outcomes)) {
      outcomes = market.outcomes;
    } else {
      outcomes = ['Yes', 'No'];
    }

    const endDateStr = market.endDate || event.endDate;
    const endTimestamp = Math.floor(new Date(endDateStr).getTime() / 1000);

    // Skip if market has ended
    if (endTimestamp < Date.now() / 1000) {
      console.log(`[${i + 1}/${events.length}] ⏭️  Skipping (ended): ${title.substring(0, 50)}...`);
      continue;
    }

    // Skip if too many outcomes (max 10)
    if (outcomes.length > 10) {
      console.log(`[${i + 1}/${events.length}] ⏭️  Skipping (>10 outcomes): ${title.substring(0, 50)}...`);
      continue;
    }

    console.log(`[${i + 1}/${events.length}] 📤 Deploying: ${title.substring(0, 50)}...`);
    console.log(`   Market ID: ${marketId}`);
    console.log(`   Outcomes: ${outcomes.join(', ')}`);
    console.log(`   Ends: ${new Date(endTimestamp * 1000).toLocaleDateString()}`);

    if (dryRun) {
      console.log(`   ✓ Dry run - would deploy\n`);
      deployed++;
      results.push({ marketId, status: 'dry-run' });
      continue;
    }

    try {
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
      results.push({ marketId, status: 'success', signature });

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      const errorMsg = error.message || '';
      const errorLogs = error.logs?.join(' ') || '';

      // Check if market already exists (custom program error: 0x0)
      if (errorMsg.includes('custom program error: 0x0') ||
          errorLogs.includes('already in use') ||
          errorMsg.includes('already in use')) {
        console.log(`   ⚠️  Already exists, skipping...\n`);
        results.push({ marketId, status: 'already-exists' });
        continue;
      }

      console.error(`   ❌ Failed: ${errorMsg}\n`);
      failed++;
      results.push({ marketId, status: 'failed', error: errorMsg });

      // If we get insufficient funds error, stop deployment
      if (errorMsg.includes('insufficient funds') ||
          errorMsg.includes('custom program error: 0x1')) {
        console.error('⛔ Insufficient funds. Stopping deployment.');
        break;
      }
    }
  }

  // Summary
  console.log('\n=== Deployment Summary ===');
  console.log(`Total markets fetched: ${events.length}`);
  console.log(`Successfully deployed: ${deployed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${events.length > 0 ? ((deployed / events.length) * 100).toFixed(1) : 0}%`);

  // Save results to file
  const resultsPath = path.join(__dirname, 'deployment-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to: ${resultsPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
