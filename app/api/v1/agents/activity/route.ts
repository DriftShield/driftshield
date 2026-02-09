import { NextRequest, NextResponse } from "next/server";
import { getRecentActions, getActionStats } from "@/lib/agents/activity-log";

/**
 * GET /api/v1/agents/activity
 *
 * Fetch the real activity log from autonomous agent cycles.
 * No auth required — this feeds the public dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const count = Math.min(parseInt(searchParams.get("count") || "50"), 200);
  const agentId = searchParams.get("agent_id") || undefined;

  const actions = getRecentActions(count, agentId);
  const stats = getActionStats();

  return NextResponse.json({
    success: true,
    count: actions.length,
    stats,
    actions,
  });
}
