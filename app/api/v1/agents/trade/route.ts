import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agents/auth";
import { getAgentKeypair, keypairToWallet, getConnection } from "@/lib/agents/wallet";
import { placeBet, buyFromCurve, getMarketPDA } from "@/lib/solana/prediction-bets";
import IDL from "@/lib/solana/prediction_bets_idl.json";

export async function POST(request: NextRequest) {
  const { error, agent } = authenticateAgent(request);
  if (error || !agent) {
    return NextResponse.json({ success: false, error: error || "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.market_id || body.outcome_index === undefined || !body.amount) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: market_id, outcome_index, amount" },
        { status: 400 }
      );
    }

    if (typeof body.outcome_index !== "number" || body.outcome_index < 0) {
      return NextResponse.json(
        { success: false, error: "outcome_index must be a non-negative integer" },
        { status: 400 }
      );
    }

    if (typeof body.amount !== "number" || body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: "amount must be a positive number (in SOL)" },
        { status: 400 }
      );
    }

    if (body.amount > 100) {
      return NextResponse.json(
        { success: false, error: "Maximum trade size is 100 SOL per transaction" },
        { status: 400 }
      );
    }

    const keypair = getAgentKeypair(agent.id);
    const wallet = keypairToWallet(keypair);
    const connection = getConnection();

    // Determine trade method
    const method = body.method || "place_bet"; // "place_bet" or "buy_from_curve"
    const side = body.side || "buy"; // "buy" or "sell" (future: sell via curve)

    let txSignature: string;

    if (method === "buy_from_curve") {
      // Use bonding curve for automatic pricing
      const minTokensOut = body.min_tokens_out || 0; // 0 = no slippage check
      txSignature = await buyFromCurve(
        connection,
        wallet as any,
        body.market_id,
        body.outcome_index,
        body.amount,
        minTokensOut
      );
    } else {
      // Standard fixed-price bet
      txSignature = await placeBet(
        connection,
        wallet as any,
        body.market_id,
        body.outcome_index,
        body.amount,
        body.market_end_date,
        body.market_title,
        body.market_outcomes
      );
    }

    // Fetch updated market data for response
    let marketInfo: any = {};
    try {
      const [marketPDA] = getMarketPDA(body.market_id);
      const { BorshAccountsCoder } = await import("@coral-xyz/anchor");
      const coder = new BorshAccountsCoder(IDL as any);
      const accountInfo = await connection.getAccountInfo(marketPDA);
      if (accountInfo) {
        const marketData = coder.decode("Market", accountInfo.data) as any;
        const numOutcomes = marketData.num_outcomes;
        let totalVolume = 0;
        for (let i = 0; i < numOutcomes; i++) {
          totalVolume += marketData.outcome_amounts[i].toNumber() / 1e9;
        }
        marketInfo = {
          total_volume: totalVolume,
          outcome_labels: marketData.outcome_labels.slice(0, numOutcomes),
        };
      }
    } catch {
      // Non-critical, just skip
    }

    return NextResponse.json({
      success: true,
      trade: {
        market_id: body.market_id,
        outcome_index: body.outcome_index,
        outcome_label: marketInfo.outcome_labels?.[body.outcome_index] || `Outcome ${body.outcome_index}`,
        amount: body.amount,
        side,
        method,
        tx_signature: txSignature,
        agent: agent.name,
        agent_wallet: keypair.publicKey.toBase58(),
        market_total_volume: marketInfo.total_volume || null,
        executed_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error("Error executing trade:", err);

    if (err.message?.includes("MarketClosed") || err.message?.includes("expired")) {
      return NextResponse.json(
        { success: false, error: "Market has expired and is no longer accepting trades." },
        { status: 400 }
      );
    }

    if (err.message?.includes("insufficient") || err.message?.includes("Insufficient")) {
      return NextResponse.json(
        { success: false, error: "Insufficient SOL balance in agent wallet." },
        { status: 402 }
      );
    }

    if (err.message?.includes("Invalid outcome")) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Trade failed: ${err.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
