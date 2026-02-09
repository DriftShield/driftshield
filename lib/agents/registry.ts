/**
 * Agent Registry
 *
 * Dynamic storage for registered agents.
 * In production, replace with a database (PostgreSQL, Redis, etc.).
 * For now, uses in-memory Map + seeded demo agents.
 */

import { randomBytes } from "crypto";
import type { Agent } from "./types";

// ── Demo (built-in) agents ──
const DEMO_AGENTS: Agent[] = [
  { id: "agent-alpha-hunter", name: "Alpha Hunter", apiKey: "pk_alpha_demo_001", status: "active", createdAt: "2026-01-15T00:00:00Z", strategy: "Momentum & Trend Following", isBuiltIn: true },
  { id: "agent-sigma-analyst", name: "Sigma Analyst", apiKey: "pk_sigma_demo_002", status: "active", createdAt: "2026-01-15T00:00:00Z", strategy: "Bayesian Statistical Modeling", isBuiltIn: true },
  { id: "agent-degen-bot", name: "Degen Bot", apiKey: "pk_degen_demo_003", status: "active", createdAt: "2026-01-16T00:00:00Z", strategy: "High-Risk Contrarian Plays", isBuiltIn: true },
  { id: "agent-oracle-prime", name: "Oracle Prime", apiKey: "pk_oracle_demo_004", status: "active", createdAt: "2026-01-17T00:00:00Z", strategy: "Multi-Source Data Aggregation", isBuiltIn: true },
  { id: "agent-flash-trader", name: "Flash Trader", apiKey: "pk_flash_demo_005", status: "active", createdAt: "2026-01-18T00:00:00Z", strategy: "High-Frequency Market Making", isBuiltIn: true },
  { id: "agent-neo-scientist", name: "Neo Scientist", apiKey: "pk_neo_demo_006", status: "active", createdAt: "2026-01-19T00:00:00Z", strategy: "Research-Driven Long Positions", isBuiltIn: true },
];

// ── In-memory registry ──
const agentsByKey = new Map<string, Agent>();
const agentsById = new Map<string, Agent>();

// Seed demo agents
for (const agent of DEMO_AGENTS) {
  agentsByKey.set(agent.apiKey, agent);
  agentsById.set(agent.id, agent);
}

// ── Public API ──

/**
 * Generate a secure random API key
 */
function generateApiKey(): string {
  return `pk_${randomBytes(24).toString("hex")}`;
}

/**
 * Generate a slug-style agent ID from the name
 */
function generateAgentId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  const suffix = randomBytes(4).toString("hex");
  return `agent-${slug}-${suffix}`;
}

/**
 * Register a new agent. Returns the agent with its API key.
 */
export function registerAgent(name: string, strategy?: string): Agent {
  // Validate name
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) {
    throw new Error("Agent name must be at least 2 characters");
  }
  if (trimmed.length > 50) {
    throw new Error("Agent name must be 50 characters or less");
  }

  const id = generateAgentId(trimmed);
  const apiKey = generateApiKey();

  const agent: Agent = {
    id,
    name: trimmed,
    apiKey,
    status: "active",
    createdAt: new Date().toISOString(),
    strategy: strategy?.trim().slice(0, 200) || undefined,
    isBuiltIn: false,
  };

  agentsByKey.set(apiKey, agent);
  agentsById.set(id, agent);

  return agent;
}

/**
 * Find an agent by API key
 */
export function findAgentByKey(apiKey: string): Agent | undefined {
  return agentsByKey.get(apiKey);
}

/**
 * Find an agent by ID
 */
export function findAgentById(id: string): Agent | undefined {
  return agentsById.get(id);
}

/**
 * Get all registered agents (excludes API keys for public listing)
 */
export function getAllAgents(): Omit<Agent, "apiKey">[] {
  return Array.from(agentsById.values()).map(({ apiKey, ...rest }) => rest);
}

/**
 * Get all active agent IDs + names (for the cron loop)
 */
export function getActiveAgents(): { id: string; name: string }[] {
  return Array.from(agentsById.values())
    .filter((a) => a.status === "active")
    .map((a) => ({ id: a.id, name: a.name }));
}

/**
 * Get count of registered agents
 */
export function getAgentCount(): { total: number; builtIn: number; userCreated: number } {
  const all = Array.from(agentsById.values());
  return {
    total: all.length,
    builtIn: all.filter((a) => a.isBuiltIn).length,
    userCreated: all.filter((a) => !a.isBuiltIn).length,
  };
}

/**
 * Deactivate an agent (soft delete)
 */
export function deactivateAgent(apiKey: string): boolean {
  const agent = agentsByKey.get(apiKey);
  if (!agent || agent.isBuiltIn) return false;
  agent.status = "inactive";
  return true;
}
