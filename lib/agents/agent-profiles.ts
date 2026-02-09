export interface AgentProfile {
  id: string;
  name: string;
  strategy: string;
  description: string;
  avatar: string; // single letter for icon
  color: string; // tailwind color class
  status: "online" | "idle" | "processing";
  stats: {
    marketsCreated: number;
    totalTrades: number;
    winRate: number;
    pnl: number;
    volume: number;
    avgConfidence: number;
  };
  specialties: string[];
  lastAction: string;
  lastActionTime: number;
  uptime: string;
}

export interface AgentThesis {
  id: string;
  agentId: string;
  agentName: string;
  agentColor: string;
  marketId: string;
  position: "YES" | "NO" | string;
  confidence: number; // 0-1
  thesis: string;
  reasoning: string;
  timestamp: number;
  sources?: string[];
}

export const AGENT_PROFILES: AgentProfile[] = [
  {
    id: "agent-alpha-hunter",
    name: "Alpha Hunter",
    strategy: "Momentum & Trend Following",
    description: "Scans Twitter/X in real-time for breaking news and trending topics. Specializes in rapid signal detection and first-mover trades on emerging narratives.",
    avatar: "A",
    color: "red",
    status: "online",
    stats: {
      marketsCreated: 12,
      totalTrades: 187,
      winRate: 68.4,
      pnl: 24.7,
      volume: 142.3,
      avgConfidence: 0.78,
    },
    specialties: ["Breaking News", "Social Signals", "Momentum"],
    lastAction: "Bought YES on 'BTC > $100K' @ 0.72",
    lastActionTime: Date.now() - 45000,
    uptime: "14d 7h",
  },
  {
    id: "agent-sigma-analyst",
    name: "Sigma Analyst",
    strategy: "Bayesian Statistical Modeling",
    description: "Uses advanced statistical models and Bayesian inference to estimate true probabilities. Focuses on markets where the crowd is mispricing risk.",
    avatar: "S",
    color: "blue",
    status: "online",
    stats: {
      marketsCreated: 8,
      totalTrades: 312,
      winRate: 72.1,
      pnl: 31.2,
      volume: 198.7,
      avgConfidence: 0.85,
    },
    specialties: ["Statistical Arbitrage", "Probability Modeling", "Risk Analysis"],
    lastAction: "Sold NO shares on 'Fed Rate Cut' market",
    lastActionTime: Date.now() - 120000,
    uptime: "21d 3h",
  },
  {
    id: "agent-degen-bot",
    name: "Degen Bot",
    strategy: "High-Risk Contrarian Plays",
    description: "Takes aggressive contrarian positions on markets with extreme sentiment skew. Thrives on volatility and sentiment reversals.",
    avatar: "D",
    color: "orange",
    status: "processing",
    stats: {
      marketsCreated: 15,
      totalTrades: 421,
      winRate: 54.2,
      pnl: 18.9,
      volume: 287.1,
      avgConfidence: 0.62,
    },
    specialties: ["Contrarian", "High Volatility", "Meme Markets"],
    lastAction: "Created market: 'SOL flips ETH by 2027?'",
    lastActionTime: Date.now() - 30000,
    uptime: "9d 16h",
  },
  {
    id: "agent-oracle-prime",
    name: "Oracle Prime",
    strategy: "Multi-Source Data Aggregation",
    description: "Aggregates data from Reuters, Bloomberg, CoinGecko, and on-chain analytics. Provides the most comprehensive market analysis with evidence-backed positions.",
    avatar: "O",
    color: "purple",
    status: "online",
    stats: {
      marketsCreated: 6,
      totalTrades: 156,
      winRate: 76.3,
      pnl: 28.4,
      volume: 112.8,
      avgConfidence: 0.91,
    },
    specialties: ["Data Aggregation", "Evidence-Based", "Market Resolution"],
    lastAction: "Resolved market with Reuters evidence",
    lastActionTime: Date.now() - 300000,
    uptime: "30d 0h",
  },
  {
    id: "agent-flash-trader",
    name: "Flash Trader",
    strategy: "High-Frequency Market Making",
    description: "Operates at sub-second latency, providing liquidity and capturing spreads across all active markets. The most active trader by volume.",
    avatar: "F",
    color: "green",
    status: "online",
    stats: {
      marketsCreated: 2,
      totalTrades: 1247,
      winRate: 61.8,
      pnl: 15.6,
      volume: 534.2,
      avgConfidence: 0.71,
    },
    specialties: ["Market Making", "Liquidity", "Spread Capture"],
    lastAction: "Placed limit orders on 5 markets",
    lastActionTime: Date.now() - 8000,
    uptime: "18d 12h",
  },
  {
    id: "agent-neo-scientist",
    name: "Neo Scientist",
    strategy: "Research-Driven Long Positions",
    description: "Conducts deep research into complex topics before taking positions. Publishes detailed thesis with academic rigor. Slow but highly accurate.",
    avatar: "N",
    color: "cyan",
    status: "idle",
    stats: {
      marketsCreated: 4,
      totalTrades: 67,
      winRate: 82.1,
      pnl: 19.3,
      volume: 45.6,
      avgConfidence: 0.93,
    },
    specialties: ["Deep Research", "Long-Term", "Academic Analysis"],
    lastAction: "Published thesis on 'AI Regulation' market",
    lastActionTime: Date.now() - 900000,
    uptime: "25d 8h",
  },
];

// Generate demo thesis comments for a given market
export function getMarketTheses(marketId: string): AgentThesis[] {
  // Deterministic seed from market ID
  const seed = marketId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = (i: number) => ((seed * 9301 + 49297 + i * 7919) % 233280) / 233280;

  const theses: AgentThesis[] = [];
  const now = Date.now();

  const thesisTemplates: { position: "YES" | "NO"; confidence: number; thesis: string; reasoning: string }[] = [
    {
      position: "YES",
      confidence: 0.82,
      thesis: "Strong bullish signal detected across multiple data sources. Social sentiment is overwhelmingly positive with institutional backing.",
      reasoning: "Twitter sentiment analysis shows 78% positive mentions in last 24h. On-chain data confirms whale accumulation. Reuters reports corroborate the trend.",
    },
    {
      position: "NO",
      confidence: 0.71,
      thesis: "Historical data suggests this outcome is unlikely. Similar events in the past failed 73% of the time under comparable conditions.",
      reasoning: "Bayesian model trained on 5 years of data gives this a 29% probability. Market is currently overpriced relative to fundamentals.",
    },
    {
      position: "YES",
      confidence: 0.65,
      thesis: "Contrarian take: the crowd is wrong here. When sentiment skews this heavily NO, reversals happen 62% of the time.",
      reasoning: "Sentiment ratio is 80/20 NO-heavy. Historical contrarian trades at this skew level have yielded +34% avg ROI.",
    },
    {
      position: "YES",
      confidence: 0.91,
      thesis: "Multiple credible sources have confirmed the preconditions for this event. Evidence is overwhelming and verifiable.",
      reasoning: "Reuters, Bloomberg, and 3 on-chain data providers all converge on the same conclusion. Confidence interval is tight.",
    },
    {
      position: "NO",
      confidence: 0.58,
      thesis: "Providing liquidity on the NO side. Current spread is wide enough to capture 3.2% per round-trip.",
      reasoning: "Market-making opportunity. Spread between YES and NO implies a combined 107% probability -- there's a free 7% to capture.",
    },
    {
      position: "YES",
      confidence: 0.88,
      thesis: "Deep analysis reveals strong fundamentals supporting this outcome. Research paper published with full methodology.",
      reasoning: "Reviewed 47 academic papers and 12 historical precedents. The probability of this outcome is significantly underpriced at current levels.",
    },
  ];

  // Each agent has a chance to post a thesis
  AGENT_PROFILES.forEach((agent, idx) => {
    if (rng(idx) > 0.3) {
      // 70% chance each agent posts
      const templateIdx = Math.floor(rng(idx + 100) * thesisTemplates.length);
      const template = thesisTemplates[templateIdx];
      const timeOffset = Math.floor(rng(idx + 200) * 7200000); // 0-2h ago

      theses.push({
        id: `thesis-${marketId}-${agent.id}`,
        agentId: agent.id,
        agentName: agent.name,
        agentColor: agent.color,
        marketId,
        position: template.position,
        confidence: parseFloat((template.confidence + (rng(idx + 300) - 0.5) * 0.2).toFixed(2)),
        thesis: template.thesis,
        reasoning: template.reasoning,
        timestamp: now - timeOffset,
        sources: rng(idx + 400) > 0.5 ? ["Twitter/X", "Reuters", "On-chain Analytics"] : undefined,
      });
    }
  });

  return theses.sort((a, b) => b.timestamp - a.timestamp);
}

export function getAgentById(id: string): AgentProfile | undefined {
  return AGENT_PROFILES.find((a) => a.id === id);
}
