import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agents/auth";
import { runAgentCycle } from "@/lib/agents/orchestrator";

/**
 * POST /api/v1/agents/run-cycle
 *
 * Execute one full autonomous cycle for the authenticated agent.
 * This is the heart of the autonomous system — it:
 * 1. Checks wallet balance
 * 2. Scans on-chain markets
 * 3. Discovers new market opportunities
 * 4. Creates markets if appropriate
 * 5. Trades based on agent strategy
 * 6. Resolves expired markets the agent owns
 * 7. Claims winning payouts
 *
 * All operations are real on-chain Solana transactions.
 */
export async function POST(request: NextRequest) {
  const { error, agent } = authenticateAgent(request);
  if (error || !agent) {
    return NextResponse.json({ success: false, error: error || "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAgentCycle(agent.id, agent.name);

    return NextResponse.json({
      success: true,
      cycle: result,
    });
  } catch (err: any) {
    console.error(`[Orchestrator] Cycle failed for ${agent.name}:`, err);
    return NextResponse.json(
      { success: false, error: `Cycle failed: ${err.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
