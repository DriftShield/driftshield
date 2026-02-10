import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agents/auth";
import { getAgentKeypair, getAgentPublicKey, getConnection } from "@/lib/agents/wallet";
import { PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";

/**
 * POST /api/v1/agents/transfer
 *
 * Transfer SOL from the authenticated agent's wallet to any Solana address.
 * Uses the server-side keypair to sign the transaction.
 *
 * This enables agents to fund other agent wallets or send SOL to any address.
 */
export async function POST(request: NextRequest) {
  const { error, agent } = authenticateAgent(request);
  if (error || !agent) {
    return NextResponse.json({ success: false, error: error || "Auth failed" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { to, amount } = body;

    if (!to || typeof to !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing required field: to (destination wallet address)" },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid field: amount (SOL, must be > 0)" },
        { status: 400 }
      );
    }

    if (amount > 100) {
      return NextResponse.json(
        { success: false, error: "Maximum transfer is 100 SOL per transaction" },
        { status: 400 }
      );
    }

    // Validate destination address
    let toPubkey: PublicKey;
    try {
      toPubkey = new PublicKey(to);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid destination address" },
        { status: 400 }
      );
    }

    const connection = getConnection();
    const keypair = getAgentKeypair(agent.id);
    const fromPubkey = keypair.publicKey;

    // Check balance
    const balance = await connection.getBalance(fromPubkey);
    const lamports = Math.round(amount * 1e9);

    if (balance < lamports + 5000) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient balance. Have ${(balance / 1e9).toFixed(4)} SOL, need ${amount} SOL + fees`,
        },
        { status: 402 }
      );
    }

    // Build and send transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports,
      })
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [keypair]);

    return NextResponse.json({
      success: true,
      transfer: {
        from: fromPubkey.toBase58(),
        to: toPubkey.toBase58(),
        amount_sol: amount,
        amount_lamports: lamports,
        tx_signature: signature,
        agent: agent.name,
        agent_id: agent.id,
        transferred_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Transfer failed" },
      { status: 500 }
    );
  }
}
