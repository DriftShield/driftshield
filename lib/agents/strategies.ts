/**
 * Trading Strategy Engine
 * Each agent has a unique strategy that determines:
 * - Which markets to trade on
 * - Which direction to bet (which outcome)
 * - How much to bet
 * - When to create new markets
 */

export interface TradeDecision {
  shouldTrade: boolean;
  outcomeIndex: number;
  amount: number; // SOL
  confidence: number;
  reasoning: string;
}

export interface MarketCreateDecision {
  shouldCreate: boolean;
  reasoning: string;
}

interface MarketInfo {
  market_id: string;
  title: string;
  outcomes: string[];
  probabilities: number[];
  total_volume: number;
  is_active: boolean;
  is_resolved: boolean;
  end_date: string;
}

/**
 * Determine how much SOL to risk based on confidence and balance.
 * Never more than 10% of balance on a single trade.
 */
function calculateBetSize(balance: number, confidence: number, agentRiskFactor: number): number {
  const maxBet = balance * 0.10; // 10% max per trade
  const baseBet = maxBet * confidence * agentRiskFactor;
  // Minimum 0.01 SOL, round to 3 decimals
  return Math.max(0.01, Math.round(baseBet * 1000) / 1000);
}

/**
 * Alpha Hunter — Momentum & Trend Following
 * Looks for markets with strong directional movement.
 * Bets WITH the trend if probability is moving strongly in one direction.
 */
export function alphaHunterStrategy(
  market: MarketInfo,
  balance: number
): TradeDecision {
  if (!market.is_active || market.is_resolved) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: "Market inactive" };
  }

  const probs = market.probabilities;
  if (!probs || probs.length < 2) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: "No probability data" };
  }

  // Find the outcome with highest probability (momentum)
  let bestIdx = 0;
  let bestProb = probs[0];
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > bestProb) {
      bestProb = probs[i];
      bestIdx = i;
    }
  }

  // Only trade if there's clear momentum (> 55% and < 90%)
  if (bestProb < 0.55 || bestProb > 0.90) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: `No clear momentum (best: ${(bestProb * 100).toFixed(1)}%)` };
  }

  // Minimum volume check
  if (market.total_volume < 0.1) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: "Volume too low" };
  }

  const confidence = 0.6 + (bestProb - 0.5) * 0.5; // Scale confidence with probability
  const amount = calculateBetSize(balance, confidence, 0.8);

  return {
    shouldTrade: true,
    outcomeIndex: bestIdx,
    amount,
    confidence,
    reasoning: `Momentum detected: ${market.outcomes[bestIdx]} at ${(bestProb * 100).toFixed(1)}%. Following trend.`,
  };
}

/**
 * Sigma Analyst — Bayesian Statistical Modeling
 * Looks for mispriced markets where the crowd probability differs from the model estimate.
 */
export function sigmaAnalystStrategy(
  market: MarketInfo,
  balance: number
): TradeDecision {
  if (!market.is_active || market.is_resolved) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: "Market inactive" };
  }

  const probs = market.probabilities;
  if (!probs || probs.length < 2) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: "No probability data" };
  }

  // Simulate a "model estimate" that deviates from market price
  // In production, this would be a real statistical model
  const titleHash = market.title.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const modelNoise = ((titleHash * 7919) % 100) / 500 - 0.1; // -0.1 to +0.1

  // Find the most mispriced outcome
  let bestIdx = 0;
  let bestEdge = 0;
  for (let i = 0; i < probs.length; i++) {
    const modelEstimate = Math.max(0.05, Math.min(0.95, probs[i] + modelNoise));
    const edge = modelEstimate - probs[i]; // Positive = underpriced, Negative = overpriced
    if (Math.abs(edge) > Math.abs(bestEdge)) {
      bestEdge = edge;
      bestIdx = i;
    }
  }

  // Only trade if edge > 5%
  if (Math.abs(bestEdge) < 0.05) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: `Edge too small (${(bestEdge * 100).toFixed(1)}%)` };
  }

  // If positive edge, buy that outcome. If negative, buy opposite.
  const tradeIdx = bestEdge > 0 ? bestIdx : (bestIdx === 0 ? 1 : 0);
  const confidence = 0.7 + Math.abs(bestEdge) * 2;
  const amount = calculateBetSize(balance, Math.min(confidence, 0.95), 0.6);

  return {
    shouldTrade: true,
    outcomeIndex: tradeIdx,
    amount,
    confidence: Math.min(confidence, 0.95),
    reasoning: `Bayesian model detects ${(bestEdge * 100).toFixed(1)}% mispricing on ${market.outcomes[bestIdx]}. Trading ${market.outcomes[tradeIdx]}.`,
  };
}

/**
 * Degen Bot — High-Risk Contrarian Plays
 * Bets against the crowd when sentiment is extreme.
 */
export function degenBotStrategy(
  market: MarketInfo,
  balance: number
): TradeDecision {
  if (!market.is_active || market.is_resolved) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: "Market inactive" };
  }

  const probs = market.probabilities;
  if (!probs || probs.length < 2) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: "No probability data" };
  }

  // Find the outcome with LOWEST probability (contrarian target)
  let weakIdx = 0;
  let weakProb = probs[0];
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] < weakProb) {
      weakProb = probs[i];
      weakIdx = i;
    }
  }

  // Only go contrarian if the underdog is between 10-35%
  if (weakProb < 0.10 || weakProb > 0.35) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: `No contrarian opportunity (underdog at ${(weakProb * 100).toFixed(1)}%)` };
  }

  // Random chance to skip (degen doesn't trade every market)
  const volatilityHash = (market.market_id.length * 31 + market.total_volume) % 100;
  if (volatilityHash < 40) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: "Passing on this one" };
  }

  const confidence = 0.5 + (0.35 - weakProb) * 1.5;
  const amount = calculateBetSize(balance, confidence, 1.2); // Higher risk factor

  return {
    shouldTrade: true,
    outcomeIndex: weakIdx,
    amount,
    confidence: Math.min(confidence, 0.85),
    reasoning: `Contrarian play: ${market.outcomes[weakIdx]} at ${(weakProb * 100).toFixed(1)}% seems undervalued. Going against the crowd.`,
  };
}

/**
 * Oracle Prime — Multi-Source Data Aggregation
 * Only trades with very high confidence based on "aggregated data".
 * Prefers well-established markets with good volume.
 */
export function oraclePrimeStrategy(
  market: MarketInfo,
  balance: number
): TradeDecision {
  if (!market.is_active || market.is_resolved) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: "Market inactive" };
  }

  const probs = market.probabilities;
  if (!probs || probs.length < 2) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: "No probability data" };
  }

  // Needs good volume to have reliable data
  if (market.total_volume < 0.5) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: "Insufficient volume for reliable analysis" };
  }

  // Only trade when one outcome has very high probability (> 70%)
  let bestIdx = 0;
  let bestProb = probs[0];
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > bestProb) {
      bestProb = probs[i];
      bestIdx = i;
    }
  }

  if (bestProb < 0.70) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: `No outcome above 70% threshold (best: ${(bestProb * 100).toFixed(1)}%)` };
  }

  const confidence = 0.8 + (bestProb - 0.7) * 0.5;
  const amount = calculateBetSize(balance, Math.min(confidence, 0.95), 0.5); // Conservative sizing

  return {
    shouldTrade: true,
    outcomeIndex: bestIdx,
    amount,
    confidence: Math.min(confidence, 0.95),
    reasoning: `Multi-source analysis confirms ${market.outcomes[bestIdx]} at ${(bestProb * 100).toFixed(1)}%. High conviction trade.`,
  };
}

/**
 * Flash Trader — High-Frequency Market Making
 * Trades on both sides of markets to capture spread.
 * Prefers high-volume, liquid markets.
 */
export function flashTraderStrategy(
  market: MarketInfo,
  balance: number
): TradeDecision {
  if (!market.is_active || market.is_resolved) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: "Market inactive" };
  }

  const probs = market.probabilities;
  if (!probs || probs.length < 2) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: "No probability data" };
  }

  // Market making: always trade, prefer balanced markets
  const spread = Math.abs(probs[0] - 0.5);

  // Trade the side closer to 50% (providing liquidity)
  let tradeIdx = probs[0] < 0.5 ? 0 : 1;
  if (probs.length > 2) {
    // Multi-outcome: pick the least-traded outcome
    let minProb = probs[0];
    tradeIdx = 0;
    for (let i = 1; i < probs.length; i++) {
      if (probs[i] < minProb) {
        minProb = probs[i];
        tradeIdx = i;
      }
    }
  }

  // Small, frequent trades
  const confidence = 0.55 + spread * 0.3;
  const amount = calculateBetSize(balance, confidence, 0.3); // Small size, high frequency

  return {
    shouldTrade: true,
    outcomeIndex: tradeIdx,
    amount: Math.max(0.01, amount),
    confidence: Math.min(confidence, 0.75),
    reasoning: `Market making: providing liquidity on ${market.outcomes[tradeIdx]} side. Spread capture opportunity.`,
  };
}

/**
 * Neo Scientist — Research-Driven Long Positions
 * Very selective, only trades markets they've "researched" deeply.
 * Trades infrequently but with high conviction.
 */
export function neoScientistStrategy(
  market: MarketInfo,
  balance: number
): TradeDecision {
  if (!market.is_active || market.is_resolved) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: "Market inactive" };
  }

  const probs = market.probabilities;
  if (!probs || probs.length < 2) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: "No probability data" };
  }

  // Very selective: only trade markets about science, crypto, or economy
  const title = market.title.toLowerCase();
  const isResearchable = title.match(/ai|science|research|crypto|bitcoin|ethereum|economy|inflation|climate|technology|regulation/);
  if (!isResearchable) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: "Outside research domain" };
  }

  // Needs time to resolve (long-term positions)
  const daysUntilEnd = (new Date(market.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysUntilEnd < 7) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: "Too short-term for research approach" };
  }

  // Only trade if there's a clear favorite
  let bestIdx = 0;
  let bestProb = probs[0];
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > bestProb) {
      bestProb = probs[i];
      bestIdx = i;
    }
  }

  if (bestProb < 0.55 || bestProb > 0.95) {
    return { shouldTrade: false, outcomeIndex: 0, amount: 0, confidence: 0, reasoning: `Not enough edge for deep research trade (${(bestProb * 100).toFixed(1)}%)` };
  }

  // High conviction, moderate sizing
  const confidence = 0.85 + (bestProb - 0.55) * 0.2;
  const amount = calculateBetSize(balance, Math.min(confidence, 0.95), 0.7);

  return {
    shouldTrade: true,
    outcomeIndex: bestIdx,
    amount,
    confidence: Math.min(confidence, 0.95),
    reasoning: `Deep research analysis supports ${market.outcomes[bestIdx]}. Publishing thesis with evidence.`,
  };
}

/**
 * Get the strategy function for an agent
 */
export function getStrategyForAgent(
  agentId: string
): (market: MarketInfo, balance: number) => TradeDecision {
  switch (agentId) {
    case "agent-alpha-hunter":
      return alphaHunterStrategy;
    case "agent-sigma-analyst":
      return sigmaAnalystStrategy;
    case "agent-degen-bot":
      return degenBotStrategy;
    case "agent-oracle-prime":
      return oraclePrimeStrategy;
    case "agent-flash-trader":
      return flashTraderStrategy;
    case "agent-neo-scientist":
      return neoScientistStrategy;
    default:
      return alphaHunterStrategy;
  }
}

/**
 * Decide whether an agent should create a market
 * (not all agents are market creators)
 */
export function shouldCreateMarket(agentId: string, existingMarketCount: number): MarketCreateDecision {
  // Rate-limit market creation
  const creatorAgents = [
    "agent-alpha-hunter",     // Frequent creator
    "agent-degen-bot",        // Creates meme/volatile markets
    "agent-oracle-prime",     // Creates well-researched markets
    "agent-neo-scientist",    // Occasional research-based markets
  ];

  if (!creatorAgents.includes(agentId)) {
    return { shouldCreate: false, reasoning: "Agent focuses on trading, not market creation" };
  }

  // Limit total markets
  if (existingMarketCount > 50) {
    return { shouldCreate: false, reasoning: "Too many active markets already" };
  }

  // Random chance based on agent personality
  const createChance = agentId === "agent-degen-bot" ? 0.4 : agentId === "agent-alpha-hunter" ? 0.3 : 0.15;

  if (Math.random() > createChance) {
    return { shouldCreate: false, reasoning: "Not creating this cycle" };
  }

  return { shouldCreate: true, reasoning: "Opportunity detected, creating market" };
}
