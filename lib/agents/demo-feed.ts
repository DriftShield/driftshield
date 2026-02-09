import type { AgentAction } from "./types";

const agentNames = [
  "Alpha Hunter",
  "Sigma Analyst",
  "Degen Bot",
  "Oracle Prime",
  "Flash Trader",
  "Neo Scientist",
];

const actionTemplates: { type: AgentAction["type"]; descriptions: string[] }[] = [
  {
    type: "monitor",
    descriptions: [
      "Scanning Twitter for trending crypto topics...",
      "Monitoring Reuters feed for macroeconomic signals...",
      "Detected spike in mentions: 'ETH merge' (+340%)",
      "Tracking sentiment shift on #Bitcoin — bearish divergence",
      "New signal detected: Fed rate decision chatter rising",
      "Scanning X for breaking news about Solana ecosystem",
    ],
  },
  {
    type: "analyze",
    descriptions: [
      "Running NLP sentiment analysis on 2,400 tweets...",
      "Probability model updated: BTC > $100K → 0.73",
      "Cross-referencing Polymarket data with on-chain signals",
      "Bayesian model converging: confidence at 0.89",
      "Analyzing historical correlation: Fed decisions vs crypto",
      "Processing 1,200 data points for market creation signal",
    ],
  },
  {
    type: "create_market",
    descriptions: [
      'Created market: "Will ETH hit $5K by March 2026?"',
      'New market deployed: "Fed rate cut in Q1 2026?"',
      'Market created: "Solana TVL exceeds $20B by Feb?"',
      'Deployed market: "Will BTC dominance drop below 50%?"',
      'Created market: "Next US CPI below 3%?"',
    ],
  },
  {
    type: "trade",
    descriptions: [
      "Bought 0.5 SOL of YES shares @ 0.72",
      "Sold 0.3 SOL of NO shares @ 0.28 (profit: +0.12 SOL)",
      "Executing momentum strategy: buying YES @ 0.65",
      "Market making: placed limit orders on both sides",
      "Taking profit on ETH market: +18.4% ROI",
      "Arbitrage detected: buying underpriced NO @ 0.15",
    ],
  },
  {
    type: "resolve",
    descriptions: [
      "Proposing resolution for expired market (evidence attached)",
      'Market resolved: "Fed cut rates" → YES wins',
      "Submitting resolution proof from Reuters API",
      "Resolution confirmed by consensus: outcome #2 wins",
    ],
  },
  {
    type: "claim",
    descriptions: [
      "Claimed payout: 1.24 SOL from resolved market",
      "Auto-claiming winnings from 3 resolved markets",
      "Payout received: 0.87 SOL → reinvesting",
      "Claimed 2.1 SOL — redeploying to active markets",
    ],
  },
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let actionCounter = 0;

export function getDemoActions(count: number): AgentAction[] {
  const actions: AgentAction[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const template = randomItem(actionTemplates);
    const agentName = randomItem(agentNames);
    actionCounter++;

    actions.push({
      id: `action-${now}-${actionCounter}`,
      agentId: `agent-${agentName.toLowerCase().replace(/\s/g, "-")}`,
      agentName,
      type: template.type,
      description: `[${agentName}] ${randomItem(template.descriptions)}`,
      timestamp: now - i * (Math.random() * 30000 + 5000),
    });
  }

  return actions.sort((a, b) => b.timestamp - a.timestamp);
}
