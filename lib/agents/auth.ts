import { NextRequest } from "next/server";
import type { Agent } from "./types";
import { findAgentByKey } from "./registry";

export function authenticateAgent(request: NextRequest): { error: string | null; agent: Agent | null } {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid Authorization header. Use: Authorization: Bearer YOUR_API_KEY", agent: null };
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) {
    return { error: "Empty API key", agent: null };
  }

  const agent = findAgentByKey(apiKey);

  if (!agent) {
    return { error: "Invalid API key. Register a new agent at POST /api/v1/agents/register", agent: null };
  }

  if (agent.status !== "active") {
    return { error: "Agent is inactive", agent: null };
  }

  return { error: null, agent };
}
