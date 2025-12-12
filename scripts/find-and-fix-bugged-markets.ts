import { Connection, Keypair } from '@solana/web3.js';
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
  console.log('=== Finding and Fixing Bugged Markets ===\n');

  // Fetch Polymarket events
  const response = await fetch(`${POLYMARKET_API_BASE}/events?limit=500&active=true&closed=false`);
  const allEvents = await response.json();

  // Filter for events with 2-10 markets (should be multi-outcome)
  const multiOutcomeEvents = allEvents.filter((event: PolymarketEvent) => {
    return event.markets && event.markets.length > 1 && event.markets.length <= 10;
  });

  console.log(`Found ${multiOutcomeEvents.length} events that should be multi-outcome\n`);

  // Load existing deployment results to check which were already deployed
  const resultsPath = path.join(__dirname, 'deployment-results.json');
  let deployedMarkets: any[] = [];
  if (fs.existsSync(resultsPath)) {
    deployedMarkets = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
  }

  const deployedIds = new Set(deployedMarkets.map(m => m.marketId));

  // Find bugged markets (deployed as pm-* instead of pm-multi-*)
  const buggedMarkets: string[] = [];
  const needsDeployment: PolymarketEvent[] = [];

  for (const event of multiOutcomeEvents) {
    const binaryId = `pm-${event.id}`;
    const multiId = `pm-multi-${event.id}`;

    const hasBinary = deployedIds.has(binaryId);
    const hasMulti = deployedIds.has(multiId);

    if (hasBinary && !hasMulti) {
      buggedMarkets.push(binaryId);
      needsDeployment.push(event);
    } else if (!hasBinary && !hasMulti) {
      needsDeployment.push(event);
    }
  }

  console.log(`Bugged markets (deployed as binary, should be multi): ${buggedMarkets.length}`);
  console.log(`Markets needing deployment: ${needsDeployment.length}\n`);

  if (buggedMarkets.length > 0) {
    console.log('Bugged market IDs (to blacklist):');
    buggedMarkets.forEach(id => console.log(`  - ${id}`));
    console.log('');

    // Write blacklist
    const blacklistPath = path.join(__dirname, '..', 'lib', 'constants', 'market-blacklist.ts');
    const blacklistContent = `// Auto-generated: Markets that were incorrectly deployed as binary
// These have been re-deployed with correct pm-multi-* IDs
export const MARKET_BLACKLIST = new Set([
${buggedMarkets.map(id => `  '${id}',`).join('\n')}
]);
`;
    fs.writeFileSync(blacklistPath, blacklistContent);
    console.log(`✅ Blacklist written to: ${blacklistPath}\n`);
  }

  if (needsDeployment.length === 0) {
    console.log('✅ No markets need deployment');
    return;
  }

  console.log(`\n=== Deploying ${needsDeployment.length} Multi-Outcome Markets ===\n`);

  // Setup connection and wallet
  const connection = new Connection(RPC_URL, 'confirmed');
  const keypair = await loadWallet();
  const wallet = new Wallet(keypair);

  let deployed = 0;
  let failed = 0;
  let alreadyExists = 0;

  for (let i = 0; i < needsDeployment.length; i++) {
    const event = needsDeployment[i];
    const title = event.title.substring(0, 200);

    // Extract outcomes from market questions
    const outcomes = event.markets.map(m => {
      const question = m.question;

      const patterns = [
        /Will (no|zero) .+ happen/i,
        /Will (\d+)\+? .+ happen/i,
        /^(\w+(?:\s+\w+){0,2}) out as/i,
        /Will (?:the )?(\w+(?:\s+\w+)?) (?:win|be the largest)/i,
        /Will (\w+(?:\s+\w+){0,2})/i,
      ];

      for (const pattern of patterns) {
        const match = question.match(pattern);
        if (match && match[1]) {
          let extracted = match[1];
          if (extracted.toLowerCase() === 'no' || extracted.toLowerCase() === 'zero') {
            extracted = '0';
          }
          return extracted;
        }
      }

      // Handle "another X" pattern
      if (question.includes('another')) {
        return 'Other';
      }

      return question.split(' ').slice(1, 4).join(' ').replace(/\?/g, '').trim();
    }).slice(0, 10);

    // Sort outcomes
    outcomes.sort((a, b) => {
      const aNum = parseFloat(a.replace('+', ''));
      const bNum = parseFloat(b.replace('+', ''));
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      if (!isNaN(aNum)) return -1;
      if (!isNaN(bNum)) return 1;
      return a.localeCompare(b);
    });

    const marketId = `pm-multi-${event.id}`;
    const endDateStr = event.markets[0].endDate || event.endDate;
    const endTimestamp = Math.floor(new Date(endDateStr).getTime() / 1000);

    console.log(`[${i + 1}/${needsDeployment.length}] 📤 ${title.substring(0, 60)}...`);
    console.log(`   Market ID: ${marketId}`);
    console.log(`   Outcomes: ${outcomes.join(', ')}`);

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

      console.log(`   ✅ Deployed! TX: ${signature}\n`);
      deployed++;

      // Update results
      deployedMarkets.push({ marketId, status: 'success', signature });
      fs.writeFileSync(resultsPath, JSON.stringify(deployedMarkets, null, 2));

      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      const errorMsg = error.message || '';

      if (errorMsg.includes('custom program error: 0x0') || errorMsg.includes('already in use')) {
        console.log(`   ⚠️  Already exists\n`);
        alreadyExists++;
        deployedMarkets.push({ marketId, status: 'already-exists' });
      } else {
        console.error(`   ❌ Failed: ${errorMsg}\n`);
        failed++;
        deployedMarkets.push({ marketId, status: 'failed', error: errorMsg });
      }

      fs.writeFileSync(resultsPath, JSON.stringify(deployedMarkets, null, 2));
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Deployed: ${deployed}`);
  console.log(`Already existed: ${alreadyExists}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total bugged markets blacklisted: ${buggedMarkets.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
