/**
 * Polymarket API Integration
 * Fetches both binary and multi-outcome markets
 */

import {
  Market,
  BinaryMarket,
  MultiOutcomeMarket,
  PolymarketEvent,
  PolymarketMarket,
  polymarketEventToMarket,
  polymarketMarketToBinary,
} from '@/lib/types/market';

const POLYMARKET_API_BASE = 'https://gamma-api.polymarket.com';

export interface FetchMarketsOptions {
  limit?: number;
  active?: boolean;
  includeBinary?: boolean;
  includeMultiOutcome?: boolean;
}

/**
 * Fetch multi-outcome markets from Polymarket events
 */
export async function fetchPolymarketEvents(options: FetchMarketsOptions = {}): Promise<MultiOutcomeMarket[]> {
  const {
    limit = 20,
    active = true,
  } = options;

  try {
    const url = `${POLYMARKET_API_BASE}/events?limit=${limit}&active=${active}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.statusText}`);
    }

    const events: PolymarketEvent[] = await response.json();

    // Convert events to multi-outcome markets
    const multiOutcomeMarkets: MultiOutcomeMarket[] = [];

    for (const event of events) {
      // Only include events with multiple markets
      if (event.markets && event.markets.length > 1) {
        const market = polymarketEventToMarket(event);
        if (market) {
          multiOutcomeMarkets.push(market);
        }
      }
    }

    return multiOutcomeMarkets;
  } catch (error) {
    console.error('Error fetching Polymarket events:', error);
    return [];
  }
}

/**
 * Fetch binary markets from Polymarket
 */
export async function fetchPolymarketBinaryMarkets(options: FetchMarketsOptions = {}): Promise<BinaryMarket[]> {
  const {
    limit = 20,
    active = true,
  } = options;

  try {
    const url = `${POLYMARKET_API_BASE}/markets?limit=${limit}&active=${active}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.statusText}`);
    }

    const markets: PolymarketMarket[] = await response.json();

    return markets.map((market) => polymarketMarketToBinary(market));
  } catch (error) {
    console.error('Error fetching Polymarket binary markets:', error);
    return [];
  }
}

/**
 * Fetch all markets (both binary and multi-outcome)
 */
export async function fetchAllPolymarketMarkets(options: FetchMarketsOptions = {}): Promise<Market[]> {
  const {
    limit = 20,
    includeBinary = true,
    includeMultiOutcome = true,
  } = options;

  const allMarkets: Market[] = [];

  if (includeMultiOutcome) {
    const multiOutcome = await fetchPolymarketEvents({ ...options, limit });
    allMarkets.push(...multiOutcome);
  }

  if (includeBinary) {
    const binary = await fetchPolymarketBinaryMarkets({ ...options, limit });
    allMarkets.push(...binary);
  }

  // Sort by volume descending
  return allMarkets.sort((a, b) => b.volume - a.volume);
}

/**
 * Fetch a specific event by ID
 */
export async function fetchPolymarketEvent(eventId: string): Promise<PolymarketEvent | null> {
  try {
    const url = `${POLYMARKET_API_BASE}/events/${eventId}`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Polymarket event:', error);
    return null;
  }
}

/**
 * Fetch a specific market by ID
 */
export async function fetchPolymarketMarket(marketId: string): Promise<PolymarketMarket | null> {
  try {
    const url = `${POLYMARKET_API_BASE}/markets/${marketId}`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Polymarket market:', error);
    return null;
  }
}

/**
 * Search markets by query
 */
export async function searchPolymarketMarkets(query: string, limit: number = 10): Promise<Market[]> {
  try {
    // Fetch all markets and filter client-side
    const allMarkets = await fetchAllPolymarketMarkets({ limit: 50 });
    const queryLower = query.toLowerCase();

    return allMarkets
      .filter((market) => market.question.toLowerCase().includes(queryLower))
      .slice(0, limit);
  } catch (error) {
    console.error('Error searching Polymarket markets:', error);
    return [];
  }
}
