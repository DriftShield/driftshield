/**
 * Market Discovery Engine
 * Finds new market opportunities by scanning Polymarket trending markets
 * and generating unique market questions that don't yet exist on-chain.
 */

import { polymarketClient, type SimplifiedMarket } from "@/lib/polymarket/client";

export interface MarketOpportunity {
  title: string;
  outcomes: string[];
  endDate: string;
  category: string;
  source: "polymarket" | "twitter" | "generated";
  sourceId?: string;
  confidence: number; // How confident we are this is a good market
  estimatedProbability: number; // Agent's estimate of the YES probability
}

/**
 * Category preferences per agent strategy
 */
const AGENT_CATEGORY_PREFERENCES: Record<string, string[]> = {
  "agent-alpha-hunter": ["Crypto", "Politics", "Economy"],
  "agent-sigma-analyst": ["Economy", "Science", "Politics"],
  "agent-degen-bot": ["Crypto", "Sports", "Entertainment", "Other"],
  "agent-oracle-prime": ["Politics", "Economy", "Science"],
  "agent-flash-trader": ["Crypto", "Sports", "Economy"],
  "agent-neo-scientist": ["Science", "Crypto", "Economy"],
};

/**
 * Discover market opportunities from Polymarket trending data.
 * Returns markets that are active on Polymarket but could be mirrored on Predictfy.
 */
export async function discoverFromPolymarket(
  agentId: string,
  existingMarketTitles: string[],
  limit: number = 5
): Promise<MarketOpportunity[]> {
  try {
    const trending = await polymarketClient.getTrendingMarkets(50);
    if (!trending || trending.length === 0) return [];

    const preferences = AGENT_CATEGORY_PREFERENCES[agentId] || ["Crypto", "Politics"];
    const existingTitlesLower = new Set(existingMarketTitles.map((t) => t.toLowerCase().trim()));

    const opportunities: MarketOpportunity[] = [];

    for (const market of trending) {
      // Skip if a similar market already exists on our platform
      const questionLower = market.question.toLowerCase().trim();
      if (existingTitlesLower.has(questionLower)) continue;

      // Check for partial title matches (fuzzy dedup)
      const words = questionLower.split(/\s+/).filter((w) => w.length > 3);
      const hasSimilar = Array.from(existingTitlesLower).some((existing) => {
        const matchingWords = words.filter((w) => existing.includes(w));
        return matchingWords.length >= words.length * 0.6; // 60% word overlap = duplicate
      });
      if (hasSimilar) continue;

      // Skip inactive or already closed
      if (!market.active) continue;

      // Skip markets that end too soon (< 1 day) or too far out (> 1 year)
      const endDate = new Date(market.endDate);
      const daysUntilEnd = (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilEnd < 1 || daysUntilEnd > 365) continue;

      // Prefer markets matching agent's category preferences
      const categoryBonus = preferences.includes(market.category) ? 0.2 : 0;

      // Higher volume = more interesting market
      const volumeScore = Math.min(market.volume / 100000, 1) * 0.3;

      // Markets with probability between 0.2 and 0.8 are more interesting (not obvious)
      const probInterest = 1 - Math.abs(market.probability - 0.5) * 2;
      const probScore = probInterest * 0.3;

      const confidence = Math.min(0.95, 0.2 + categoryBonus + volumeScore + probScore);

      opportunities.push({
        title: market.question,
        outcomes: market.outcomes.length >= 2 ? market.outcomes : ["Yes", "No"],
        endDate: market.endDate,
        category: market.category,
        source: "polymarket",
        sourceId: market.id,
        confidence,
        estimatedProbability: market.probability,
      });
    }

    // Sort by confidence and return top N
    return opportunities.sort((a, b) => b.confidence - a.confidence).slice(0, limit);
  } catch (err) {
    console.error("[Discovery] Error fetching Polymarket data:", err);
    return [];
  }
}

/**
 * Generate synthetic market ideas when Polymarket is unavailable.
 * Uses templates + randomization to create diverse markets.
 */
export function generateMarketIdeas(agentId: string, count: number = 3): MarketOpportunity[] {
  const now = Date.now();
  const templates = [
    { title: "Will Bitcoin exceed ${price}K by ${month} ${year}?", cat: "Crypto", outcomes: ["Yes", "No"] },
    { title: "Will Ethereum surpass ${price}K by ${month} ${year}?", cat: "Crypto", outcomes: ["Yes", "No"] },
    { title: "Will SOL reach $${price} by ${month} ${year}?", cat: "Crypto", outcomes: ["Yes", "No"] },
    { title: "Will the Fed cut interest rates in ${month} ${year}?", cat: "Economy", outcomes: ["Yes", "No"] },
    { title: "Will US inflation drop below ${num}% by ${month} ${year}?", cat: "Economy", outcomes: ["Yes", "No"] },
    { title: "Will AI regulation pass in the US by ${year}?", cat: "Science", outcomes: ["Yes", "No"] },
    { title: "Which party wins the next ${country} election?", cat: "Politics", outcomes: ["Party A", "Party B", "Other"] },
    { title: "Will ${coin} flip ${othercoin} in market cap by ${year}?", cat: "Crypto", outcomes: ["Yes", "No"] },
  ];

  const months = ["March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const prices = ["80", "100", "120", "150", "200"];
  const smallPrices = ["150", "200", "250", "300", "400"];
  const nums = ["2", "2.5", "3", "3.5"];
  const coins = ["SOL", "AVAX", "DOT", "MATIC"];
  const othercoins = ["BNB", "XRP", "ADA"];
  const countries = ["US", "UK", "France", "Germany"];

  const rng = () => Math.random();
  const pick = <T>(arr: T[]) => arr[Math.floor(rng() * arr.length)];

  const ideas: MarketOpportunity[] = [];
  const usedTemplates = new Set<number>();

  for (let i = 0; i < Math.min(count, templates.length); i++) {
    let idx: number;
    do {
      idx = Math.floor(rng() * templates.length);
    } while (usedTemplates.has(idx) && usedTemplates.size < templates.length);
    usedTemplates.add(idx);

    const template = templates[idx];
    const month = pick(months);
    const year = "2026";
    const daysOut = 30 + Math.floor(rng() * 300);
    const endDate = new Date(now + daysOut * 86400000).toISOString();

    let title = template.title
      .replace("${price}", pick(prices))
      .replace("${month}", month)
      .replace("${year}", year)
      .replace("${num}", pick(nums))
      .replace("${coin}", pick(coins))
      .replace("${othercoin}", pick(othercoins))
      .replace("${country}", pick(countries));

    if (title.includes("SOL reach")) {
      title = title.replace("${price}", pick(smallPrices));
    }

    ideas.push({
      title,
      outcomes: template.outcomes,
      endDate,
      category: template.cat,
      source: "generated",
      confidence: 0.5 + rng() * 0.3,
      estimatedProbability: 0.3 + rng() * 0.4,
    });
  }

  return ideas;
}
