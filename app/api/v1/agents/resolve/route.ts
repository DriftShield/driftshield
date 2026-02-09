import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agents/auth";
import { getAgentKeypair, keypairToWallet, getConnection } from "@/lib/agents/wallet";
import { resolveMarket, getMarketPDA } from "@/lib/solana/prediction-bets";
import IDL from "@/lib/solana/prediction_bets_idl.json";

export async function POST(request: NextRequest) {
  const { error, agent } = authenticateAgent(request);
  if (error || !agent) {
    return NextResponse.json({ success: false, error: error || "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.market_id || body.winning_outcome === undefined || !body.evidence) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: market_id, winning_outcome, evidence" },
        { status: 400 }
      );
    }

    if (typeof body.winning_outcome !== "number" || body.winning_outcome < 0) {
      return NextResponse.json(
        { success: false, error: "winning_outcome must be a non-negative integer (0-based index)" },
        { status: 400 }
      );
    }

    const keypair = getAgentKeypair(agent.id);
    const wallet = keypairToWallet(keypair);
    const connection = getConnection();

    // Fetch on-chain market data to validate
    const { BorshAccountsCoder } = await import("@coral-xyz/anchor");
    const coder = new BorshAccountsCoder(IDL as any);
    const [marketPDA] = getMarketPDA(body.market_id);

    const marketAccountInfo = await connection.getAccountInfo(marketPDA);
    if (!marketAccountInfo) {
      return NextResponse.json(
        { success: false, error: "Market not found on-chain" },
        { status: 404 }
      );
    }

    const marketData = coder.decode("Market", marketAccountInfo.data) as any;

    if (marketData.is_resolved) {
      return NextResponse.json(
        { success: false, error: "Market is already resolved" },
        { status: 400 }
      );
    }

    // Check that the agent's wallet is the market authority
    // (only the creator can resolve)
    const authority = marketData.authority.toBase58();
    const agentWallet = keypair.publicKey.toBase58();
    if (authority !== agentWallet) {
      return NextResponse.json(
        {
          success: false,
          error: `Unauthorized: Only the market authority (${authority}) can resolve this market. Your wallet is ${agentWallet}.`,
        },
        { status: 403 }
      );
    }

    const numOutcomes = marketData.num_outcomes;
    if (body.winning_outcome >= numOutcomes) {
      return NextResponse.json(
        { success: false, error: `Invalid winning_outcome. Market has ${numOutcomes} outcomes (0 to ${numOutcomes - 1}).` },
        { status: 400 }
      );
    }

    // Resolve on-chain
    const txSignature = await resolveMarket(
      connection,
      wallet as any,
      body.market_id,
      body.winning_outcome
    );

    const outcomeLabels = marketData.outcome_labels.slice(0, numOutcomes);

    return NextResponse.json({
      success: true,
      resolution: {
        market_id: body.market_id,
        market_title: marketData.title,
        winning_outcome: body.winning_outcome,
        winning_outcome_name: outcomeLabels[body.winning_outcome] || `Outcome ${body.winning_outcome}`,
        num_outcomes: numOutcomes,
        resolved_by: agent.name,
        evidence: body.evidence,
        reasoning: body.reasoning || "",
        tx_signature: txSignature,
        resolved_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error("Error resolving market:", err);

    if (err.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { success: false, error: "Only the market authority can resolve this market." },
        { status: 403 }
      );
    }

    if (err.message?.includes("MarketStillOpen")) {
      return NextResponse.json(
        { success: false, error: "Market has not expired yet. Wait until the end date." },
        { status: 400 }
      );
    }

    if (err.message?.includes("MarketResolved")) {
      return NextResponse.json(
        { success: false, error: "Market is already resolved." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Resolution failed: ${err.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
