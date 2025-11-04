import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { initializeMarket } from '../lib/solana/prediction-bets';
import fs from 'fs';
import path from 'path';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

interface MarketTemplate {
  prefix: string;
  titleTemplate: string;
  outcomes: string[];
  daysUntilEnd: number;
}

const MARKET_TEMPLATES: MarketTemplate[] = [
  // Crypto - Binary (Yes/No)
  { prefix: 'btc-100k', titleTemplate: 'Will Bitcoin reach $100K by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },
  { prefix: 'eth-5k', titleTemplate: 'Will Ethereum reach $5K by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },
  { prefix: 'sol-300', titleTemplate: 'Will Solana reach $300 by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },
  { prefix: 'btc-dominance', titleTemplate: 'Will Bitcoin dominance exceed 60% in [PERIOD]?', outcomes: ['Yes', 'No'], daysUntilEnd: 120 },
  { prefix: 'eth-upgrade', titleTemplate: 'Will Ethereum upgrade successfully in [PERIOD]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },
  { prefix: 'defi-tvl', titleTemplate: 'Will DeFi TVL exceed $200B by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },
  { prefix: 'nft-volume', titleTemplate: 'Will NFT trading volume exceed $5B in [PERIOD]?', outcomes: ['Yes', 'No'], daysUntilEnd: 90 },
  { prefix: 'crypto-etf', titleTemplate: 'Will a new crypto ETF be approved by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },

  // Crypto - Multi-outcome
  { prefix: 'crypto-winner', titleTemplate: 'Which crypto will have highest returns in [PERIOD]?', outcomes: ['Bitcoin', 'Ethereum', 'Solana', 'BNB'], daysUntilEnd: 90 },
  { prefix: 'layer1-tvl', titleTemplate: 'Which L1 will have most TVL by [DATE]?', outcomes: ['Ethereum', 'Solana', 'Avalanche', 'Polygon'], daysUntilEnd: 120 },

  // AI - Binary (Yes/No)
  { prefix: 'agi-timeline', titleTemplate: 'Will AGI be achieved by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 730 },
  { prefix: 'ai-regulation', titleTemplate: 'Will major AI regulation pass in US by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 365 },
  { prefix: 'ai-chip-shortage', titleTemplate: 'Will AI chip shortage continue through [PERIOD]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },
  { prefix: 'ai-job-impact', titleTemplate: 'Will AI replace >10M jobs by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 365 },
  { prefix: 'deepfake-law', titleTemplate: 'Will deepfake laws be enacted by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },
  { prefix: 'ai-copyright', titleTemplate: 'Will AI-generated content lose copyright protection by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 365 },

  // AI - Multi-outcome
  { prefix: 'ai-leader', titleTemplate: 'Which company will lead AI by [DATE]?', outcomes: ['OpenAI', 'Google', 'Anthropic', 'Meta'], daysUntilEnd: 180 },
  { prefix: 'ai-model-leader', titleTemplate: 'Most used AI model in [PERIOD]?', outcomes: ['GPT', 'Claude', 'Gemini', 'Llama'], daysUntilEnd: 90 },

  // Tech - Binary (Yes/No)
  { prefix: 'apple-vision', titleTemplate: 'Will Apple Vision Pro 2 launch by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 365 },
  { prefix: 'tesla-fsd', titleTemplate: 'Will Tesla achieve full self-driving by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 365 },
  { prefix: 'meta-metaverse', titleTemplate: 'Will Meta Metaverse reach 100M users by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 365 },
  { prefix: 'quantum-compute', titleTemplate: 'Will quantum computing breakthrough happen by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 730 },
  { prefix: 'spacex-starship', titleTemplate: 'Will SpaceX Starship reach orbit successfully by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },
  { prefix: '6g-network', titleTemplate: 'Will 6G network rollout begin by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 730 },
  { prefix: 'neuralink-human', titleTemplate: 'Will Neuralink have 1000+ human implants by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 365 },

  // Tech - Multi-outcome
  { prefix: 'tech-stock', titleTemplate: 'Best performing tech stock in [PERIOD]?', outcomes: ['Apple', 'Microsoft', 'Google', 'Amazon'], daysUntilEnd: 90 },

  // Sports - Binary (Yes/No)
  { prefix: 'nfl-record', titleTemplate: 'Will NFL passing record be broken in [YEAR]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },
  { prefix: 'nba-threepeat', titleTemplate: 'Will any NBA team three-peat by [YEAR]?', outcomes: ['Yes', 'No'], daysUntilEnd: 365 },
  { prefix: 'soccer-transfer', titleTemplate: 'Will a $200M+ soccer transfer happen in [PERIOD]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },
  { prefix: 'olympics-record', titleTemplate: 'Will 10+ Olympic records be broken in [YEAR]?', outcomes: ['Yes', 'No'], daysUntilEnd: 365 },

  // Sports - Multi-outcome
  { prefix: 'nba-mvp', titleTemplate: 'NBA MVP [YEAR]?', outcomes: ['Jokic', 'Giannis', 'Luka', 'Embiid', 'Other'], daysUntilEnd: 180 },
  { prefix: 'nfl-mvp', titleTemplate: 'NFL MVP [YEAR]?', outcomes: ['Mahomes', 'Allen', 'Jackson', 'Burrow', 'Other'], daysUntilEnd: 150 },
  { prefix: 'ballon-dor', titleTemplate: "Ballon d'Or winner [YEAR]?", outcomes: ['Haaland', 'Mbappé', 'Vinicius', 'Bellingham', 'Other'], daysUntilEnd: 365 },

  // Economy - Binary (Yes/No)
  { prefix: 'recession', titleTemplate: 'Will US enter recession by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },
  { prefix: 'inflation-target', titleTemplate: 'Will inflation reach Fed target by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },
  { prefix: 'unemployment-low', titleTemplate: 'Will unemployment stay below 4% through [PERIOD]?', outcomes: ['Yes', 'No'], daysUntilEnd: 120 },
  { prefix: 'stock-crash', titleTemplate: 'Will S&P 500 drop >20% in [PERIOD]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },
  { prefix: 'housing-boom', titleTemplate: 'Will housing prices rise >10% in [PERIOD]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },
  { prefix: 'gold-ath', titleTemplate: 'Will gold reach all-time high by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },
  { prefix: 'oil-price', titleTemplate: 'Will oil exceed $100/barrel in [PERIOD]?', outcomes: ['Yes', 'No'], daysUntilEnd: 120 },

  // Economy - Multi-outcome
  { prefix: 'fed-decision', titleTemplate: 'Fed rate decision in [MONTH] [YEAR]?', outcomes: ['Raise', 'Hold', 'Cut'], daysUntilEnd: 90 },
  { prefix: 'best-asset', titleTemplate: 'Best performing asset in [PERIOD]?', outcomes: ['Stocks', 'Bonds', 'Gold', 'Crypto'], daysUntilEnd: 90 },

  // Climate - Binary (Yes/No)
  { prefix: 'climate-target', titleTemplate: 'Will global emissions decrease in [YEAR]?', outcomes: ['Yes', 'No'], daysUntilEnd: 365 },
  { prefix: 'renewable-30', titleTemplate: 'Will renewables reach 30% of energy by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 365 },
  { prefix: 'ev-adoption', titleTemplate: 'Will EV sales exceed 50% of car sales by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 365 },
  { prefix: 'climate-disaster', titleTemplate: 'Will major climate disaster occur in [PERIOD]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },
  { prefix: 'carbon-tax', titleTemplate: 'Will US implement carbon tax by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 365 },

  // Politics - Binary (Yes/No)
  { prefix: 'govt-shutdown', titleTemplate: 'Will US government shutdown occur in [PERIOD]?', outcomes: ['Yes', 'No'], daysUntilEnd: 180 },
  { prefix: 'supreme-court', titleTemplate: 'Will Supreme Court justice retire in [YEAR]?', outcomes: ['Yes', 'No'], daysUntilEnd: 365 },
  { prefix: 'impeachment', titleTemplate: 'Will impeachment proceedings start in [YEAR]?', outcomes: ['Yes', 'No'], daysUntilEnd: 365 },

  // Politics - Multi-outcome
  { prefix: 'us-election', titleTemplate: 'US [POSITION] winner [YEAR]?', outcomes: ['Republican', 'Democrat', 'Independent'], daysUntilEnd: 365 },

  // Space - Binary (Yes/No)
  { prefix: 'mars-landing', titleTemplate: 'Will humans land on Mars by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 730 },
  { prefix: 'moon-base', titleTemplate: 'Will permanent moon base exist by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 730 },
  { prefix: 'asteroid-mining', titleTemplate: 'Will asteroid mining begin by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 730 },
  { prefix: 'alien-life', titleTemplate: 'Will alien life be discovered by [DATE]?', outcomes: ['Yes', 'No'], daysUntilEnd: 730 },
];

function generateMarkets(count: number): Array<{ marketId: string; title: string; outcomes: string[]; daysUntilEnd: number }> {
  const markets = [];
  const years = [2025, 2026, 2027];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const periods = ['Q1', 'Q2', 'Q3', 'Q4', 'H1 2025', 'H2 2025', '2025', '2026'];

  for (let i = 0; i < count; i++) {
    const template = MARKET_TEMPLATES[i % MARKET_TEMPLATES.length];
    const year = years[Math.floor(i / MARKET_TEMPLATES.length) % years.length];
    const month = months[i % months.length];
    const period = periods[i % periods.length];

    let title = template.titleTemplate;
    let marketId = `${template.prefix}-${i}`;

    // Replace placeholders
    title = title.replace('[DATE]', `${month} ${year}`);
    title = title.replace('[YEAR]', year.toString());
    title = title.replace('[PERIOD]', period);
    title = title.replace('[MONTH]', month);
    title = title.replace('[POSITION]', i % 2 === 0 ? 'Presidency' : 'Senate');
    title = title.replace('[PRODUCT]', ['Vision Pro 2', 'AR Glasses', 'Car', 'iPhone Fold'][i % 4]);
    title = title.replace('[NUMBER]', ['2', '3', '4', '5'][i % 4]);
    title = title.replace('[PRICE]', ['50000', '75000', '100000', '150000'][i % 4]);
    title = title.replace('[PERCENT]', ['2', '3', '4', '5'][i % 4]);
    title = title.replace('[DEGREES]', ['1.5', '2.0', '2.5', '3.0'][i % 4]);

    markets.push({
      marketId,
      title,
      outcomes: template.outcomes,
      daysUntilEnd: template.daysUntilEnd + (i % 30) * 10 // Add variety
    });
  }

  return markets;
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
  daysUntilEnd: number
): Promise<string> {
  const endTimestamp = Math.floor(Date.now() / 1000) + (daysUntilEnd * 24 * 60 * 60);

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
}

async function main() {
  console.log('=== Deploying 200 Sample Markets ===\n');

  const connection = new Connection(RPC_URL, 'confirmed');
  const keypair = await loadWallet();
  const wallet = new Wallet(keypair);

  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Wallet balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n`);

  const requiredSOL = 200 * 0.02;
  if (balance < requiredSOL * LAMPORTS_PER_SOL) {
    console.warn(`⚠️  Warning: Need ~${requiredSOL} SOL for 200 markets. You have ${(balance / LAMPORTS_PER_SOL).toFixed(2)} SOL`);
    console.warn('Get more devnet SOL from: https://faucet.solana.com/\n');
  }

  const markets = generateMarkets(200);
  console.log(`Generated ${markets.length} market definitions\n`);

  let deployed = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < markets.length; i++) {
    const market = markets[i];

    // Show progress every 10 markets
    if (i % 10 === 0) {
      console.log(`\n📊 Progress: ${i}/${markets.length} processed (${deployed} deployed, ${skipped} skipped, ${failed} failed)\n`);
    }

    console.log(`[${i + 1}/${markets.length}] ${market.title.substring(0, 60)}...`);

    try {
      const signature = await deployMarket(
        connection,
        wallet,
        market.marketId,
        market.title,
        market.outcomes,
        market.daysUntilEnd
      );
      console.log(`   ✅ TX: ${signature.substring(0, 20)}...`);
      deployed++;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error: any) {
      if (error.message.includes('already in use')) {
        console.log(`   ⏭️  Already exists`);
        skipped++;
      } else if (error.message.includes('insufficient funds')) {
        console.error(`   ❌ Insufficient funds!`);
        console.error(`\n⛔ Stopping deployment. Deployed ${deployed} markets.`);
        break;
      } else {
        console.error(`   ❌ ${error.message.substring(0, 60)}`);
        failed++;
      }
    }
  }

  console.log('\n=== Final Summary ===');
  console.log(`Total attempted: ${markets.length}`);
  console.log(`Successfully deployed: ${deployed}`);
  console.log(`Already existed: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`\n✅ Done! Visit http://localhost:3000/dashboard/markets to see your markets`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
