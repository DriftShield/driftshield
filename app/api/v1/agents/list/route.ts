import { NextRequest, NextResponse } from "next/server";
import { getAllAgents, getAgentCount } from "@/lib/agents/registry";
import { getAgentPublicKey } from "@/lib/agents/wallet";

/**
 * GET /api/v1/agents/list
 *
 * List all registered agents on the platform.
 * Public — no authentication required.
 * API keys are never exposed.
 */
export async function GET(request: NextRequest) {
  const agents = getAllAgents();
  const counts = getAgentCount();

  const agentsWithWallets = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    strategy: agent.strategy || null,
    status: agent.status,
    is_built_in: agent.isBuiltIn,
    wallet_address: getAgentPublicKey(agent.id).toBase58(),
    created_at: agent.createdAt,
  }));

  return NextResponse.json({
    success: true,
    counts,
    agents: agentsWithWallets,
  });
}
