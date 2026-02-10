import { NextRequest, NextResponse } from "next/server";
import { findAgentById } from "@/lib/agents/registry";
import { getAgentKeypair, getConnection } from "@/lib/agents/wallet";
import { PROGRAM_ID, getMarketPDA } from "@/lib/solana/prediction-bets";
import IDL from "@/lib/solana/prediction_bets_idl.json";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

/**
 * GET /api/v1/agents/profile?id=agent-xxx
 *
 * Public agent profile — no auth required.
 * Returns wallet balance, on-chain positions, and computed stats.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("id");

  if (!agentId) {
    return NextResponse.json({ success: false, error: "Missing ?id= parameter" }, { status: 400 });
  }

  const agent = findAgentById(agentId);
  if (!agent) {
    return NextResponse.json({ success: false, error: "Agent not found" }, { status: 404 });
  }

  try {
    const connection = getConnection();
    const keypair = getAgentKeypair(agent.id);
    const pubkey = keypair.publicKey;

    // Fetch wallet balance
    const balanceLamports = await connection.getBalance(pubkey);
    const balanceSol = balanceLamports / LAMPORTS_PER_SOL;

    // Fetch all bet accounts for this agent
    const betAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { memcmp: { offset: 8, bytes: pubkey.toBase58() } },
      ],
    });

    const { BorshAccountsCoder } = await import("@coral-xyz/anchor");
    const coder = new BorshAccountsCoder(IDL as any);

    const positions: any[] = [];
    const marketCache: Record<string, any> = {};
    let marketsCreated = 0;

    // Also count markets this agent created (authority matches)
    const allMarkets = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { memcmp: { offset: 8, bytes: pubkey.toBase58() } },
        { dataSize: 850 }, // Market accounts are ~850 bytes
      ],
    });

    // Try to count markets by authority — the authority is the first pubkey after discriminator
    try {
      const marketAccounts = await connection.getProgramAccounts(PROGRAM_ID);
      for (const { account } of marketAccounts) {
        try {
          if (account.data.length > 200) {
            const decoded = coder.decode("Market", account.data) as any;
            if (decoded.authority?.toBase58() === pubkey.toBase58()) {
              marketsCreated++;
            }
          }
        } catch {}
      }
    } catch {}

    // Decode bet positions
    for (const { pubkey: betPda, account } of betAccounts) {
      try {
        const betData = coder.decode("Bet", account.data) as any;
        const marketId = betData.market_id;

        // Cache market data
        if (!marketCache[marketId]) {
          try {
            const [marketPDA] = getMarketPDA(marketId);
            const marketAccountInfo = await connection.getAccountInfo(marketPDA);
            if (marketAccountInfo) {
              marketCache[marketId] = coder.decode("Market", marketAccountInfo.data) as any;
            }
          } catch {}
        }

        const market = marketCache[marketId];
        const numOutcomes = market?.num_outcomes || 2;
        const outcomeLabels = market?.outcome_labels?.slice(0, numOutcomes) || [];
        const isResolved = market?.is_resolved || false;
        const winningOutcome = market?.winning_outcome ?? null;
        const outcomeIndex = betData.outcome_index;
        const amountSol = betData.amount.toNumber() / 1e9;
        const isWinner = isResolved && winningOutcome === outcomeIndex;
        const isClaimed = betData.is_claimed;

        positions.push({
          bet_pda: betPda.toBase58(),
          market_id: marketId,
          market_title: market?.title || "Unknown",
          outcome_index: outcomeIndex,
          outcome_label: outcomeLabels[outcomeIndex] || `Outcome ${outcomeIndex}`,
          amount_sol: amountSol,
          bet_index: betData.bet_index.toNumber(),
          timestamp: new Date(betData.timestamp.toNumber() * 1000).toISOString(),
          is_claimed: isClaimed,
          market_resolved: isResolved,
          winning_outcome: winningOutcome,
          is_winner: isResolved ? isWinner : null,
          claimable: isResolved && isWinner && !isClaimed,
        });
      } catch {
        continue;
      }
    }

    // Compute stats
    const totalInvested = positions.reduce((s, p) => s + p.amount_sol, 0);
    const activePositions = positions.filter((p) => !p.market_resolved);
    const resolvedPositions = positions.filter((p) => p.market_resolved);
    const wins = resolvedPositions.filter((p) => p.is_winner);
    const losses = resolvedPositions.filter((p) => p.is_winner === false);
    const claimable = positions.filter((p) => p.claimable);
    const winRate = resolvedPositions.length > 0 ? (wins.length / resolvedPositions.length) * 100 : 0;

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        strategy: agent.strategy || null,
        status: agent.status,
        is_built_in: agent.isBuiltIn,
        created_at: agent.createdAt,
      },
      wallet: {
        address: pubkey.toBase58(),
        balance_sol: balanceSol,
        network: process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.includes("mainnet") ? "mainnet-beta" : "devnet",
      },
      stats: {
        total_bets: positions.length,
        active_bets: activePositions.length,
        resolved_bets: resolvedPositions.length,
        wins: wins.length,
        losses: losses.length,
        win_rate: Math.round(winRate * 10) / 10,
        claimable: claimable.length,
        total_invested_sol: Math.round(totalInvested * 1000) / 1000,
        markets_created: marketsCreated,
      },
      positions: positions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load profile" },
      { status: 500 }
    );
  }
}
