import { NextRequest, NextResponse } from "next/server";
import { runAgentCycle } from "@/lib/agents/orchestrator";

/**
 * Cron-compatible endpoint to run all agents in sequence.
 *
 * Can be triggered by:
 * - Vercel Cron (vercel.json)
 * - External cron service (e.g., cron-job.org, GitHub Actions)
 * - Manual curl request
 *
 * Security: Protected by CRON_SECRET env var.
 * Set CRON_SECRET in your environment and pass it as:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * If CRON_SECRET is not set, the endpoint is open (for development).
 */

const AGENTS = [
  { id: "agent-alpha-hunter", name: "Alpha Hunter" },
  { id: "agent-sigma-analyst", name: "Sigma Analyst" },
  { id: "agent-degen-bot", name: "Degen Bot" },
  { id: "agent-oracle-prime", name: "Oracle Prime" },
  { id: "agent-flash-trader", name: "Flash Trader" },
  { id: "agent-neo-scientist", name: "Neo Scientist" },
];

export async function GET(request: NextRequest) {
  // Security check
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const startTime = Date.now();
  const results: any[] = [];
  const errors: string[] = [];

  // Run agents in sequence to avoid rate limiting on RPC
  for (const agent of AGENTS) {
    try {
      const result = await runAgentCycle(agent.id, agent.name);
      results.push({
        agent: agent.name,
        balance: result.balance,
        tradesExecuted: result.tradesExecuted,
        marketsCreated: result.marketsCreated,
        marketsResolved: result.marketsResolved,
        payoutsClaimed: result.payoutsClaimed,
        errors: result.errors.length,
        cycleTimeMs: result.cycleTimeMs,
      });
    } catch (err: any) {
      errors.push(`${agent.name}: ${err.message}`);
      results.push({
        agent: agent.name,
        error: err.message,
      });
    }

    // Small delay between agents to avoid RPC throttling
    await new Promise((r) => setTimeout(r, 1000));
  }

  const totalTime = Date.now() - startTime;

  return NextResponse.json({
    success: true,
    summary: {
      agents_run: AGENTS.length,
      total_trades: results.reduce((s, r) => s + (r.tradesExecuted || 0), 0),
      total_markets_created: results.reduce((s, r) => s + (r.marketsCreated || 0), 0),
      total_resolved: results.reduce((s, r) => s + (r.marketsResolved || 0), 0),
      total_claims: results.reduce((s, r) => s + (r.payoutsClaimed || 0), 0),
      total_errors: errors.length,
      total_time_ms: totalTime,
      run_at: new Date().toISOString(),
    },
    agents: results,
    errors: errors.length > 0 ? errors : undefined,
  });
}

// Also support POST for webhooks
export async function POST(request: NextRequest) {
  return GET(request);
}
