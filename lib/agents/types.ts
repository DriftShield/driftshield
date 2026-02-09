export interface AgentAction {
  id: string;
  agentId: string;
  agentName: string;
  type: "monitor" | "analyze" | "create_market" | "trade" | "resolve" | "claim";
  description: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface Agent {
  id: string;
  name: string;
  apiKey: string;
  status: "active" | "inactive";
  createdAt: string;
  /** Optional description of the agent's strategy */
  strategy?: string;
  /** Whether this is a built-in demo agent or user-created */
  isBuiltIn: boolean;
}
