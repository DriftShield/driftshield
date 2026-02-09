import { NextRequest } from "next/server";
import type { Agent } from "./types";

const DEMO_AGENTS: Agent[] = [
  { id: "agent-alpha-hunter", name: "Alpha Hunter", apiKey: "pk_alpha_demo_001", status: "active", createdAt: "2026-01-15T00:00:00Z" },
  { id: "agent-sigma-analyst", name: "Sigma Analyst", apiKey: "pk_sigma_demo_002", status: "active", createdAt: "2026-01-15T00:00:00Z" },
  { id: "agent-degen-bot", name: "Degen Bot", apiKey: "pk_degen_demo_003", status: "active", createdAt: "2026-01-16T00:00:00Z" },
  { id: "agent-oracle-prime", name: "Oracle Prime", apiKey: "pk_oracle_demo_004", status: "active", createdAt: "2026-01-17T00:00:00Z" },
  { id: "agent-flash-trader", name: "Flash Trader", apiKey: "pk_flash_demo_005", status: "active", createdAt: "2026-01-18T00:00:00Z" },
  { id: "agent-neo-scientist", name: "Neo Scientist", apiKey: "pk_neo_demo_006", status: "active", createdAt: "2026-01-19T00:00:00Z" },
];

export function authenticateAgent(request: NextRequest): { error: string | null; agent: Agent | null } {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid Authorization header", agent: null };
  }

  const apiKey = authHeader.slice(7);
  const agent = DEMO_AGENTS.find((a) => a.apiKey === apiKey);

  if (!agent) {
    return { error: "Invalid API key", agent: null };
  }

  if (agent.status !== "active") {
    return { error: "Agent is inactive", agent: null };
  }

  return { error: null, agent };
}
