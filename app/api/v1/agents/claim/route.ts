import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agents/auth";
import { getAgentKeypair, keypairToWallet, getConnection } from "@/lib/agents/wallet";
import { claimPayout, getMarketPDA, getBetPDA } from "@/lib/solana/prediction-bets";
import IDL from "@/lib/solana/prediction_bets_idl.json";

export async function POST(request: NextRequest) {
  const { error, agent } = authenticateAgent(request);
  if (error || !agent) {
    return NextResponse.json({ success: false, error: error || "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.market_id || body.bet_index === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: market_id, bet_index" },
        { status: 400 }
      );
    }

    if (typeof body.bet_index !== "number" || body.bet_index < 0) {
      return NextResponse.json(
        { success: false, error: "bet_index must be a non-negative integer" },
        { status: 400 }
      );
    }

    const keypair = getAgentKeypair(agent.id);
    const wallet = keypairToWallet(keypair);
    const connection = getConnection();

    // Verify the market is resolved and the bet is a winner before submitting tx
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
    if (!marketData.is_resolved) {
      return NextResponse.json(
        { success: false, error: "Market is not yet resolved. Cannot claim payout." },
        { status: 400 }
      );
    }

    // Check the bet account
    const [betPDA] = getBetPDA(marketPDA, keypair.publicKey, body.bet_index);
    const betAccountInfo = await connection.getAccountInfo(betPDA);
    if (!betAccountInfo) {
      return NextResponse.json(
        { success: false, error: "Bet account not found. Check market_id and bet_index." },
        { status: 404 }
      );
    }

    const betData = coder.decode("Bet", betAccountInfo.data) as any;
    if (betData.is_claimed) {
      return NextResponse.json(
        { success: false, error: "This bet has already been claimed." },
        { status: 400 }
      );
    }

    const winningOutcome = marketData.winning_outcome;
    if (betData.outcome_index !== winningOutcome) {
      return NextResponse.json(
        {
          success: false,
          error: `This bet is on outcome ${betData.outcome_index} but the winner is outcome ${winningOutcome}. Cannot claim losing bet.`,
        },
        { status: 400 }
      );
    }

    // Execute the claim
    const txSignature = await claimPayout(
      connection,
      wallet as any,
      body.market_id,
      body.bet_index
    );

    const amountSol = betData.amount.toNumber() / 1e9;

    return NextResponse.json({
      success: true,
      claim: {
        market_id: body.market_id,
        bet_index: body.bet_index,
        outcome_index: betData.outcome_index,
        original_bet_sol: amountSol,
        tx_signature: txSignature,
        agent: agent.name,
        agent_wallet: keypair.publicKey.toBase58(),
        claimed_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error("Error claiming payout:", err);

    if (err.message?.includes("AlreadyClaimed")) {
      return NextResponse.json(
        { success: false, error: "Payout already claimed." },
        { status: 400 }
      );
    }

    if (err.message?.includes("LosingBet")) {
      return NextResponse.json(
        { success: false, error: "Cannot claim: this is a losing bet." },
        { status: 400 }
      );
    }

    if (err.message?.includes("MarketNotResolved")) {
      return NextResponse.json(
        { success: false, error: "Market is not yet resolved." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Claim failed: ${err.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
