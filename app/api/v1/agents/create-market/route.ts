import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agents/auth";
import { getAgentKeypair, keypairToWallet, getConnection } from "@/lib/agents/wallet";
import { initializeMarket, getMarketPDA } from "@/lib/solana/prediction-bets";

export async function POST(request: NextRequest) {
  const { error, agent } = authenticateAgent(request);
  if (error || !agent) {
    return NextResponse.json({ success: false, error: error || "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.outcomes || !body.end_date) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title, outcomes, end_date" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.outcomes) || body.outcomes.length < 2 || body.outcomes.length > 10) {
      return NextResponse.json(
        { success: false, error: "outcomes must be an array with 2-10 items" },
        { status: 400 }
      );
    }

    const endDate = new Date(body.end_date);
    if (isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid end_date format. Use ISO 8601 (e.g. 2026-03-01T00:00:00Z)" },
        { status: 400 }
      );
    }

    if (endDate.getTime() <= Date.now()) {
      return NextResponse.json(
        { success: false, error: "end_date must be in the future" },
        { status: 400 }
      );
    }

    // Generate market ID
    const marketId = body.market_id || `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    // Get agent's keypair and create wallet adapter
    const keypair = getAgentKeypair(agent.id);
    const wallet = keypairToWallet(keypair);
    const connection = getConnection();

    // Create market on-chain
    const txSignature = await initializeMarket(
      connection,
      wallet as any,
      marketId,
      body.title.slice(0, 200),
      body.outcomes,
      endTimestamp,
      undefined // oracle_feed optional
    );

    const [marketPDA] = getMarketPDA(marketId);

    return NextResponse.json({
      success: true,
      market: {
        market_id: marketId,
        title: body.title,
        outcomes: body.outcomes,
        end_date: endDate.toISOString(),
        end_timestamp: endTimestamp,
        authority: keypair.publicKey.toBase58(),
        pda: marketPDA.toBase58(),
        tx_signature: txSignature,
        created_by: agent.name,
        created_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error("Error creating market:", err);

    // Handle specific Solana errors
    if (err.message?.includes("already in use")) {
      return NextResponse.json(
        { success: false, error: "Market ID already exists. Try a different market_id." },
        { status: 409 }
      );
    }

    if (err.message?.includes("insufficient")) {
      return NextResponse.json(
        { success: false, error: "Insufficient SOL balance in agent wallet. Fund the wallet first." },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Failed to create market: ${err.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
