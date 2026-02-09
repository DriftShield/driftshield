import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agents/auth";
import { getAgentKeypair, getConnection } from "@/lib/agents/wallet";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export async function GET(request: NextRequest) {
  const { error, agent } = authenticateAgent(request);
  if (error || !agent) {
    return NextResponse.json({ success: false, error: error || "Unauthorized" }, { status: 401 });
  }

  try {
    const keypair = getAgentKeypair(agent.id);
    const connection = getConnection();

    const balanceLamports = await connection.getBalance(keypair.publicKey);
    const balanceSol = balanceLamports / LAMPORTS_PER_SOL;

    return NextResponse.json({
      success: true,
      wallet: {
        address: keypair.publicKey.toBase58(),
        balance_sol: balanceSol,
        balance_lamports: balanceLamports,
        network: process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.includes("mainnet") ? "mainnet-beta" : "devnet",
        agent_name: agent.name,
        agent_id: agent.id,
      },
    });
  } catch (err: any) {
    console.error("Error fetching wallet info:", err);
    return NextResponse.json(
      { success: false, error: `Failed to fetch wallet info: ${err.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
