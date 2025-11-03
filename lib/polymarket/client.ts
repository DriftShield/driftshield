/**
 * Polymarket API Client
 * Fetches prediction market data from Polymarket's public APIs
 */

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';
const CLOB_API_BASE = 'https://clob.polymarket.com';

export interface PolymarketMarket {
  id: string;
  question: string;
  description: string;
  image: string;
  icon: string;
  outcomes: string[];
  outcomePrices: string[];
  volume: string;
  liquidity: string;
  endDate: string;
  startDate: string;
  active: boolean;
  closed: boolean;
  marketType: string;
  groupItemTitle?: string;
  groupItemThreshold?: string;
  questionID: string;
  enableOrderBook: boolean;
  orderPriceMinTickSize: number;
  orderMinSize: number;
  volumeNum: number;
  liquidityNum: number;

  // Computed fields
  category?: string;
  probability?: number;
}

export interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  startDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  restricted: boolean;
  markets: PolymarketMarket[];
  volume?: string;
  liquidity?: string;
}

export interface SimplifiedMarket {
  id: string;
  question: string;
  category: string;
  outcomes: string[];
  volume: number;
  liquidity: number;
  probability: number;
  endDate: string;
  image?: string;
  active: boolean;
}

export class PolymarketClient {
  private gammaBaseUrl: string;
  private clobBaseUrl: string;

  constructor() {
    this.gammaBaseUrl = GAMMA_API_BASE;
    this.clobBaseUrl = CLOB_API_BASE;
  }

  /**
   * Fetch all active markets from Gamma API
   */
  async getMarkets(options: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
  } = {}): Promise<PolymarketMarket[]> {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.active !== undefined) params.append('active', options.active.toString());
      if (options.closed !== undefined) params.append('closed', options.closed.toString());

      const url = `${this.gammaBaseUrl}/markets?${params.toString()}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.status}`);
      }

      const markets: PolymarketMarket[] = await response.json();
      return markets;
    } catch (error) {
      console.error('Error fetching Polymarket markets:', error);
      return [];
    }
  }

  /**
   * Fetch a specific market by ID
   */
  async getMarket(marketId: string): Promise<PolymarketMarket | null> {
    try {
      const response = await fetch(`${this.gammaBaseUrl}/markets/${marketId}`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Market not found: ${marketId}`);
      }

      const market: PolymarketMarket = await response.json();
      return market;
    } catch (error) {
      console.error('Error fetching Polymarket market:', error);
      return null;
    }
  }

  /**
   * Fetch events (groups of markets)
   */
  async getEvents(options: {
    limit?: number;
    offset?: number;
    active?: boolean;
  } = {}): Promise<PolymarketEvent[]> {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.active !== undefined) params.append('active', options.active.toString());

      const url = `${this.gammaBaseUrl}/events?${params.toString()}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.status}`);
      }

      const events: PolymarketEvent[] = await response.json();
      return events;
    } catch (error) {
      console.error('Error fetching Polymarket events:', error);
      return [];
    }
  }

  /**
   * Get simplified markets for display
   */
  async getSimplifiedMarkets(options: {
    limit?: number;
    category?: string;
  } = {}): Promise<SimplifiedMarket[]> {
    const markets = await this.getMarkets({
      limit: options.limit || 50,
      active: true,
      closed: false,
    });

    // Show all markets (including expired ones) - betting UI will handle expiration
    return markets.map(market => this.simplifyMarket(market));
  }

  /**
   * Get trending markets (sorted by volume)
   */
  async getTrendingMarkets(limit: number = 10): Promise<SimplifiedMarket[]> {
    const markets = await this.getMarkets({
      limit: 100,
      active: true,
      closed: false,
    });

    // Show all markets sorted by volume (including expired ones)
    return markets
      .map(market => this.simplifyMarket(market))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit);
  }

  /**
   * Search markets by query
   */
  async searchMarkets(query: string, limit: number = 20): Promise<SimplifiedMarket[]> {
    const markets = await this.getMarkets({
      limit: 200,
      active: true,
    });

    const lowerQuery = query.toLowerCase();

    // Show all matching markets (including expired ones)
    return markets
      .filter(market =>
        market.question.toLowerCase().includes(lowerQuery) ||
        market.description?.toLowerCase().includes(lowerQuery)
      )
      .map(market => this.simplifyMarket(market))
      .slice(0, limit);
  }

  /**
   * Convert Polymarket market to simplified format
   */
  private simplifyMarket(market: PolymarketMarket): SimplifiedMarket {
    // Calculate probability from outcome prices
    let probability = 0.5; // Default
    if (market.outcomePrices && market.outcomePrices.length > 0) {
      probability = parseFloat(market.outcomePrices[0]) || 0.5;
    }

    // Parse volume and liquidity
    const volume = parseFloat(market.volume) || 0;
    const liquidity = parseFloat(market.liquidity) || 0;

    // Determine category from question/description
    const category = this.categorizeMarket(market);

    return {
      id: market.id,
      question: market.question,
      category,
      outcomes: market.outcomes || ['YES', 'NO'],
      volume,
      liquidity,
      probability,
      endDate: market.endDate,
      image: market.image,
      active: market.active,
    };
  }

  /**
   * Categorize market based on content
   */
  private categorizeMarket(market: PolymarketMarket): string {
    const text = `${market.question} ${market.description || ''}`.toLowerCase();

    if (text.match(/trump|biden|election|president|congress|senate|politics/)) {
      return 'Politics';
    }
    if (text.match(/bitcoin|crypto|ethereum|btc|eth|blockchain|solana/)) {
      return 'Crypto';
    }
    if (text.match(/nfl|nba|soccer|football|sports|championship|playoff/)) {
      return 'Sports';
    }
    if (text.match(/ai|science|technology|research|covid|climate/)) {
      return 'Science';
    }
    if (text.match(/economy|fed|inflation|gdp|stock|market/)) {
      return 'Economy';
    }
    if (text.match(/pop culture|celebrity|movie|music|entertainment/)) {
      return 'Entertainment';
    }

    return 'Other';
  }

  /**
   * Get markets by category
   */
  async getMarketsByCategory(category: string, limit: number = 20): Promise<SimplifiedMarket[]> {
    const markets = await this.getSimplifiedMarkets({ limit: 200 });

    return markets
      .filter(market => market.category === category)
      .slice(0, limit);
  }

  /**
   * Get market statistics
   */
  async getMarketStats(): Promise<{
    totalMarkets: number;
    totalVolume: number;
    activeMarkets: number;
    categories: Record<string, number>;
  }> {
    const markets = await this.getSimplifiedMarkets({ limit: 500 });

    const categories: Record<string, number> = {};
    let totalVolume = 0;

    markets.forEach(market => {
      categories[market.category] = (categories[market.category] || 0) + 1;
      totalVolume += market.volume;
    });

    return {
      totalMarkets: markets.length,
      totalVolume,
      activeMarkets: markets.filter(m => m.active).length,
      categories,
    };
  }
}

// Export singleton instance
export const polymarketClient = new PolymarketClient();
