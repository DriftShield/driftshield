// In-memory store for agent-related data (demo purposes)

interface StoredMarket {
  id: string;
  title: string;
  outcomes: string[];
  end_date: string;
  status: "active" | "resolved";
  winning_outcome?: number;
  created_by: string;
}

const markets: Map<string, StoredMarket> = new Map();

export function getMarket(id: string): StoredMarket | undefined {
  return markets.get(id);
}

export function setMarket(id: string, market: StoredMarket): void {
  markets.set(id, market);
}

export function getAllMarkets(): StoredMarket[] {
  return Array.from(markets.values());
}
