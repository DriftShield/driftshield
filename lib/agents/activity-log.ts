/**
 * Agent Activity Log
 * Persists agent actions in-memory (production: use a database).
 * Feeds the dashboard UI with real actions from autonomous cycles.
 */

import type { AgentAction } from "./types";

const MAX_LOG_SIZE = 500;
const activityLog: AgentAction[] = [];

/**
 * Record an agent action
 */
export function logAction(action: Omit<AgentAction, "id" | "timestamp">): AgentAction {
  const entry: AgentAction = {
    ...action,
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };

  activityLog.unshift(entry);

  // Trim to max size
  if (activityLog.length > MAX_LOG_SIZE) {
    activityLog.length = MAX_LOG_SIZE;
  }

  return entry;
}

/**
 * Get recent actions, optionally filtered by agent
 */
export function getRecentActions(count: number = 50, agentId?: string): AgentAction[] {
  const filtered = agentId ? activityLog.filter((a) => a.agentId === agentId) : activityLog;
  return filtered.slice(0, count);
}

/**
 * Get all actions for a specific cycle run
 */
export function getActionsByType(type: AgentAction["type"], count: number = 20): AgentAction[] {
  return activityLog.filter((a) => a.type === type).slice(0, count);
}

/**
 * Get action count stats
 */
export function getActionStats(): Record<AgentAction["type"], number> {
  const stats: Record<string, number> = {
    monitor: 0,
    analyze: 0,
    create_market: 0,
    trade: 0,
    resolve: 0,
    claim: 0,
  };

  for (const action of activityLog) {
    stats[action.type] = (stats[action.type] || 0) + 1;
  }

  return stats as Record<AgentAction["type"], number>;
}
