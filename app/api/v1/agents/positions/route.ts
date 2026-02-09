import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agents/auth";
import { getAgentKeypair, getConnection } from "@/lib/agents/wallet";
import { PROGRAM_ID, getMarketPDA } from "@/lib/solana/prediction-bets";
import IDL from "@/lib/solana/prediction_bets_idl.json";

export async function GET(request: NextRequest) {
  const { error, agent } = authenticateAgent(request);
  if (error || !agent) {
    return NextResponse.json({ success: false, error: error || "Unauthorized" }, { status: 401 });
  }

  try {
    const connection = getConnection();
    const keypair = getAgentKeypair(agent.id);
    const agentPubkey = keypair.publicKey;

    // Optional market_id filter
    const { searchParams } = new URL(request.url);
    const marketIdFilter = searchParams.get("market_id");

    // Fetch all bet accounts owned by this agent
    const betAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          memcmp: {
            offset: 8, // After discriminator, first field is `user` (PublicKey)
            bytes: agentPubkey.toBase58(),
          },
        },
      ],
    });

    const { BorshAccountsCoder } = await import("@coral-xyz/anchor");
    const coder = new BorshAccountsCoder(IDL as any);

    const positions: any[] = [];
    const marketCache: Record<string, any> = {};

    for (const { pubkey, account } of betAccounts) {
      try {
        const betData = coder.decode("Bet", account.data) as any;

        const marketId = betData.market_id;
        if (marketIdFilter && marketId !== marketIdFilter) continue;

        // Fetch market data (cached)
        if (!marketCache[marketId]) {
          try {
            const [marketPDA] = getMarketPDA(marketId);
            const marketAccountInfo = await connection.getAccountInfo(marketPDA);
            if (marketAccountInfo) {
              marketCache[marketId] = coder.decode("Market", marketAccountInfo.data) as any;
            }
          } catch {
            // skip
          }
        }

        const market = marketCache[marketId];
        const numOutcomes = market?.num_outcomes || 2;
        const outcomeLabels = market?.outcome_labels?.slice(0, numOutcomes) || [];
        const isResolved = market?.is_resolved || false;
        const winningOutcome = market?.winning_outcome ?? null;

        const amountSol = betData.amount.toNumber() / 1e9;
        const outcomeIndex = betData.outcome_index;
        const isWinner = isResolved && winningOutcome === outcomeIndex;
        const isClaimed = betData.is_claimed;

        positions.push({
          bet_pda: pubkey.toBase58(),
          market_id: marketId,
          market_title: market?.title || "Unknown",
          outcome_index: outcomeIndex,
          outcome_label: outcomeLabels[outcomeIndex] || `Outcome ${outcomeIndex}`,
          amount_sol: amountSol,
          bet_index: betData.bet_index.toNumber(),
          timestamp: new Date(betData.timestamp.toNumber() * 1000).toISOString(),
          is_claimed: isClaimed,
          curve_tokens: betData.curve_tokens ? betData.curve_tokens.toNumber() : null,
          market_resolved: isResolved,
          winning_outcome: winningOutcome,
          is_winner: isResolved ? isWinner : null,
          claimable: isResolved && isWinner && !isClaimed,
        });
      } catch {
        continue;
      }
    }

    // Aggregate stats
    const totalInvested = positions.reduce((s, p) => s + p.amount_sol, 0);
    const activePositions = positions.filter((p) => !p.market_resolved);
    const claimablePositions = positions.filter((p) => p.claimable);

    return NextResponse.json({
      success: true,
      agent: {
        name: agent.name,
        wallet: agentPubkey.toBase58(),
      },
      stats: {
        total_positions: positions.length,
        active_positions: activePositions.length,
        claimable_positions: claimablePositions.length,
        total_invested_sol: totalInvested,
      },
      positions,
    });
  } catch (err: any) {
    console.error("Error fetching positions:", err);
    return NextResponse.json(
      { success: false, error: `Failed to fetch positions: ${err.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
