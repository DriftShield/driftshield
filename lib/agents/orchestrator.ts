/**
 * Agent Orchestrator
 * The brain that runs one full autonomous cycle for an agent:
 * 1. Check wallet balance
 * 2. List existing on-chain markets
 * 3. Discover new market opportunities
 * 4. Create markets if appropriate
 * 5. Analyze existing markets and decide trades
 * 6. Execute trades
 * 7. Resolve expired markets the agent created
 * 8. Claim winning positions
 * 9. Log all actions
 */

import { getAgentKeypair, keypairToWallet, getConnection, getAgentBalance } from "./wallet";
import { logAction } from "./activity-log";
import { discoverFromPolymarket, generateMarketIdeas, type MarketOpportunity } from "./discovery";
import { getStrategyForAgent, shouldCreateMarket } from "./strategies";
import {
  initializeMarket,
  placeBet,
  buyFromCurve,
  resolveMarket,
  claimPayout,
  getMarketPDA,
  getBetPDA,
  getVaultPDA,
  PROGRAM_ID,
} from "@/lib/solana/prediction-bets";
import IDL from "@/lib/solana/prediction_bets_idl.json";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

interface CycleResult {
  agent: string;
  agentId: string;
  wallet: string;
  balance: number;
  actions: {
    type: string;
    success: boolean;
    details: string;
    txSignature?: string;
  }[];
  marketsScanned: number;
  tradesExecuted: number;
  marketsCreated: number;
  marketsResolved: number;
  payoutsClaimed: number;
  errors: string[];
  cycleTimeMs: number;
}

interface OnChainMarket {
  market_id: string;
  title: string;
  outcomes: string[];
  probabilities: number[];
  outcome_volumes: number[];
  total_volume: number;
  end_date: string;
  is_active: boolean;
  is_resolved: boolean;
  winning_outcome: number | null;
  authority: string;
  pda: string;
  num_outcomes: number;
}

/**
 * Fetch all on-chain markets (same logic as the /api/v1/agents/markets endpoint)
 */
async function fetchOnChainMarkets(): Promise<OnChainMarket[]> {
  const connection = getConnection();
  const programAccounts = await connection.getProgramAccounts(PROGRAM_ID);
  const { BorshAccountsCoder } = await import("@coral-xyz/anchor");
  const coder = new BorshAccountsCoder(IDL as any);

  const markets: OnChainMarket[] = [];

  for (const { pubkey, account } of programAccounts) {
    try {
      if (account.data.length < 8 || account.data.length > 10240) continue;
      const marketData = coder.decode("Market", account.data) as any;
      const numOutcomes = marketData.num_outcomes;
      if (numOutcomes === 0) continue;

      const endTimestamp = marketData.end_timestamp.toNumber();
      const endDate = new Date(endTimestamp * 1000);

      let totalVolume = 0;
      const outcomeAmounts: number[] = [];
      for (let i = 0; i < numOutcomes; i++) {
        const amount = marketData.outcome_amounts[i].toNumber() / 1e9;
        totalVolume += amount;
        outcomeAmounts.push(amount);
      }

      const probabilities = outcomeAmounts.map((a) =>
        totalVolume > 0 ? a / totalVolume : 1 / numOutcomes
      );

      markets.push({
        market_id: marketData.market_id,
        title: marketData.title,
        outcomes: marketData.outcome_labels.slice(0, numOutcomes),
        probabilities,
        outcome_volumes: outcomeAmounts,
        total_volume: totalVolume,
        end_date: endDate.toISOString(),
        is_active: endDate.getTime() > Date.now(),
        is_resolved: marketData.is_resolved,
        winning_outcome: marketData.winning_outcome ?? null,
        authority: marketData.authority.toBase58(),
        pda: pubkey.toBase58(),
        num_outcomes: numOutcomes,
      });
    } catch {
      continue;
    }
  }

  return markets;
}

/**
 * Fetch all bet accounts for an agent
 */
async function fetchAgentBets(agentPubkey: string) {
  const connection = getConnection();
  const { BorshAccountsCoder } = await import("@coral-xyz/anchor");
  const coder = new BorshAccountsCoder(IDL as any);

  const betAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 8,
          bytes: agentPubkey,
        },
      },
    ],
  });

  const bets: any[] = [];
  for (const { pubkey, account } of betAccounts) {
    try {
      const betData = coder.decode("Bet", account.data) as any;
      bets.push({
        pda: pubkey.toBase58(),
        market_id: betData.market_id,
        outcome_index: betData.outcome_index,
        amount: betData.amount.toNumber() / 1e9,
        bet_index: betData.bet_index.toNumber(),
        is_claimed: betData.is_claimed,
        timestamp: betData.timestamp.toNumber(),
      });
    } catch {
      continue;
    }
  }

  return bets;
}

/**
 * Run one full autonomous cycle for an agent.
 * This is the main entry point for the orchestrator.
 */
export async function runAgentCycle(agentId: string, agentName: string): Promise<CycleResult> {
  const startTime = Date.now();
  const keypair = getAgentKeypair(agentId);
  const wallet = keypairToWallet(keypair);
  const connection = getConnection();
  const agentWallet = keypair.publicKey.toBase58();

  const result: CycleResult = {
    agent: agentName,
    agentId,
    wallet: agentWallet,
    balance: 0,
    actions: [],
    marketsScanned: 0,
    tradesExecuted: 0,
    marketsCreated: 0,
    marketsResolved: 0,
    payoutsClaimed: 0,
    errors: [],
    cycleTimeMs: 0,
  };

  const addAction = (type: string, success: boolean, details: string, txSignature?: string) => {
    result.actions.push({ type, success, details, txSignature });
    logAction({
      agentId,
      agentName,
      type: type as any,
      description: `[${agentName}] ${details}`,
      metadata: txSignature ? { txSignature } : undefined,
    });
  };

  try {
    // ─── STEP 1: Check wallet balance ───
    const balanceLamports = await connection.getBalance(keypair.publicKey);
    result.balance = balanceLamports / LAMPORTS_PER_SOL;

    addAction("monitor", true, `Wallet balance: ${result.balance.toFixed(4)} SOL`);

    if (result.balance < 0.01) {
      addAction("monitor", false, "Insufficient balance (< 0.01 SOL). Skipping this cycle.");
      result.cycleTimeMs = Date.now() - startTime;
      return result;
    }

    // ─── STEP 2: Fetch all on-chain markets ───
    let markets: OnChainMarket[];
    try {
      markets = await fetchOnChainMarkets();
      result.marketsScanned = markets.length;
      addAction("monitor", true, `Scanned ${markets.length} on-chain markets`);
    } catch (err: any) {
      addAction("monitor", false, `Failed to fetch markets: ${err.message}`);
      result.errors.push(`Market fetch failed: ${err.message}`);
      result.cycleTimeMs = Date.now() - startTime;
      return result;
    }

    // ─── STEP 3: Discover new market opportunities ───
    const activeMarkets = markets.filter((m) => m.is_active && !m.is_resolved);
    const existingTitles = markets.map((m) => m.title);

    const createDecision = shouldCreateMarket(agentId, activeMarkets.length);

    if (createDecision.shouldCreate) {
      let opportunities: MarketOpportunity[] = [];
      try {
        opportunities = await discoverFromPolymarket(agentId, existingTitles, 3);
        addAction("analyze", true, `Discovered ${opportunities.length} market opportunities from Polymarket`);
      } catch (err: any) {
        // Fallback to generated ideas
        opportunities = generateMarketIdeas(agentId, 2);
        addAction("analyze", true, `Generated ${opportunities.length} market ideas (Polymarket unavailable)`);
      }

      // ─── STEP 4: Create markets ───
      if (opportunities.length > 0 && result.balance >= 0.05) {
        const opp = opportunities[0]; // Create the best opportunity
        const marketId = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const endTimestamp = Math.floor(new Date(opp.endDate).getTime() / 1000);

        try {
          const txSig = await initializeMarket(
            connection,
            wallet as any,
            marketId,
            opp.title.slice(0, 200),
            opp.outcomes,
            endTimestamp,
            undefined
          );

          result.marketsCreated++;
          addAction("create_market", true, `Created market: "${opp.title}" [${opp.outcomes.join("/")}]`, txSig);
        } catch (err: any) {
          addAction("create_market", false, `Failed to create market: ${err.message}`);
          result.errors.push(`Market creation failed: ${err.message}`);
        }
      }
    } else {
      addAction("analyze", true, createDecision.reasoning);
    }

    // ─── STEP 5 & 6: Analyze and trade on existing markets ───
    const strategy = getStrategyForAgent(agentId);
    const tradableMarkets = activeMarkets.filter((m) => !m.is_resolved);

    // Refresh balance after potential market creation
    const currentBalance = (await connection.getBalance(keypair.publicKey)) / LAMPORTS_PER_SOL;
    const maxTradesPerCycle = agentId === "agent-flash-trader" ? 5 : 3; // Flash Trader trades more
    let tradeCount = 0;

    for (const market of tradableMarkets) {
      if (tradeCount >= maxTradesPerCycle) break;
      if (currentBalance < 0.02) {
        addAction("trade", false, "Balance too low to continue trading");
        break;
      }

      const decision = strategy(market, currentBalance);

      if (decision.shouldTrade) {
        try {
          const txSig = await placeBet(
            connection,
            wallet as any,
            market.market_id,
            decision.outcomeIndex,
            decision.amount,
            market.end_date,
            market.title,
            market.outcomes
          );

          tradeCount++;
          result.tradesExecuted++;
          addAction(
            "trade",
            true,
            `Bought ${decision.amount.toFixed(3)} SOL of ${market.outcomes[decision.outcomeIndex]} on "${market.title}" (confidence: ${(decision.confidence * 100).toFixed(0)}%) — ${decision.reasoning}`,
            txSig
          );
        } catch (err: any) {
          addAction("trade", false, `Trade failed on "${market.title}": ${err.message}`);
          result.errors.push(`Trade failed: ${err.message}`);
        }
      }
    }

    if (tradeCount === 0) {
      addAction("analyze", true, `Analyzed ${tradableMarkets.length} markets, no trades this cycle`);
    }

    // ─── STEP 7: Resolve expired markets we created ───
    const expiredOurMarkets = markets.filter(
      (m) => !m.is_resolved && !m.is_active && m.authority === agentWallet
    );

    for (const market of expiredOurMarkets) {
      // Pick the outcome with highest probability as the winner
      let winningIdx = 0;
      let bestProb = market.probabilities[0] || 0;
      for (let i = 1; i < market.probabilities.length; i++) {
        if (market.probabilities[i] > bestProb) {
          bestProb = market.probabilities[i];
          winningIdx = i;
        }
      }

      try {
        const txSig = await resolveMarket(connection, wallet as any, market.market_id, winningIdx);
        result.marketsResolved++;
        addAction(
          "resolve",
          true,
          `Resolved "${market.title}" → Winner: ${market.outcomes[winningIdx]} (${(bestProb * 100).toFixed(0)}% probability)`,
          txSig
        );
      } catch (err: any) {
        addAction("resolve", false, `Failed to resolve "${market.title}": ${err.message}`);
        result.errors.push(`Resolve failed: ${err.message}`);
      }
    }

    // ─── STEP 8: Claim all winning positions ───
    try {
      const agentBets = await fetchAgentBets(agentWallet);

      for (const bet of agentBets) {
        if (bet.is_claimed) continue;

        // Find the corresponding market
        const market = markets.find((m) => m.market_id === bet.market_id);
        if (!market || !market.is_resolved) continue;

        // Check if this bet is a winner
        if (bet.outcome_index !== market.winning_outcome) continue;

        try {
          const txSig = await claimPayout(
            connection,
            wallet as any,
            bet.market_id,
            bet.bet_index
          );
          result.payoutsClaimed++;
          addAction(
            "claim",
            true,
            `Claimed payout from "${market.title}" — original bet: ${bet.amount.toFixed(3)} SOL`,
            txSig
          );
        } catch (err: any) {
          addAction("claim", false, `Failed to claim on "${market?.title}": ${err.message}`);
          result.errors.push(`Claim failed: ${err.message}`);
        }
      }
    } catch (err: any) {
      addAction("claim", false, `Failed to fetch positions: ${err.message}`);
      result.errors.push(`Position fetch failed: ${err.message}`);
    }

    // ─── Final balance check ───
    const finalBalance = (await connection.getBalance(keypair.publicKey)) / LAMPORTS_PER_SOL;
    result.balance = finalBalance;
    addAction("monitor", true, `Cycle complete. Final balance: ${finalBalance.toFixed(4)} SOL`);

  } catch (err: any) {
    addAction("monitor", false, `Cycle error: ${err.message}`);
    result.errors.push(`Cycle error: ${err.message}`);
  }

  result.cycleTimeMs = Date.now() - startTime;
  return result;
}
