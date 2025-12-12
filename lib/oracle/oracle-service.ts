/**
 * Oracle Service for Market Resolution
 * Supports multiple oracle providers for automated market resolution
 */

export interface OracleResult {
  outcome: number;
  confidence: number; // 0-100
  source: string;
  timestamp: number;
  proof?: string; // Optional cryptographic proof
}

export interface OracleProvider {
  name: string;
  resolve(marketId: string, question: string, outcomes: string[]): Promise<OracleResult>;
}

/**
 * Polymarket Oracle - Uses Polymarket API to check resolved markets
 */
export class PolymarketOracle implements OracleProvider {
  name = 'Polymarket';
  private apiBase = 'https://gamma-api.polymarket.com';

  async resolve(marketId: string, question: string, outcomes: string[]): Promise<OracleResult> {
    try {
      // Extract Polymarket event ID from market ID (e.g., "pm-16084" -> "16084")
      const pmId = marketId.replace('pm-', '').replace('pm-multi-', '');

      const response = await fetch(`${this.apiBase}/events/${pmId}`);
      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.status}`);
      }

      const data = await response.json();

      // Check if market is resolved on Polymarket
      if (!data.closed || !data.resolvedAt) {
        throw new Error('Market not resolved on Polymarket yet');
      }

      // For binary markets
      if (data.markets.length === 1 && outcomes.length === 2) {
        const market = data.markets[0];

        // Check which outcome won (Polymarket stores winning tokens)
        // This is a simplified version - actual implementation would need more robust checking
        const yesWon = market.outcome === 'Yes';

        return {
          outcome: yesWon ? 0 : 1,
          confidence: 100, // Polymarket resolution is definitive
          source: 'Polymarket',
          timestamp: new Date(data.resolvedAt).getTime(),
          proof: JSON.stringify({ eventId: pmId, outcome: market.outcome }),
        };
      }

      // For multi-outcome markets, match the resolved market to our outcomes
      throw new Error('Multi-outcome resolution not yet implemented');

    } catch (error: any) {
      throw new Error(`Polymarket oracle error: ${error.message}`);
    }
  }
}

/**
 * Manual Oracle - For admin manual resolution
 */
export class ManualOracle implements OracleProvider {
  name = 'Manual';

  async resolve(marketId: string, question: string, outcomes: string[]): Promise<OracleResult> {
    // Manual resolution doesn't actually fetch anything
    // It's just a wrapper for admin UI selections
    throw new Error('Manual oracle requires admin intervention');
  }
}

/**
 * Consensus Oracle - Combines multiple oracle sources
 */
export class ConsensusOracle implements OracleProvider {
  name = 'Consensus';
  private providers: OracleProvider[];
  private minimumAgreement: number;

  constructor(providers: OracleProvider[], minimumAgreement = 2) {
    this.providers = providers;
    this.minimumAgreement = minimumAgreement;
  }

  async resolve(marketId: string, question: string, outcomes: string[]): Promise<OracleResult> {
    const results = await Promise.allSettled(
      this.providers.map(p => p.resolve(marketId, question, outcomes))
    );

    const successfulResults = results
      .filter((r): r is PromiseFulfilledResult<OracleResult> => r.status === 'fulfilled')
      .map(r => r.value);

    if (successfulResults.length < this.minimumAgreement) {
      throw new Error(`Not enough oracle consensus: ${successfulResults.length}/${this.minimumAgreement} required`);
    }

    // Count votes for each outcome
    const votes = new Map<number, number>();
    for (const result of successfulResults) {
      votes.set(result.outcome, (votes.get(result.outcome) || 0) + 1);
    }

    // Find outcome with most votes
    let maxVotes = 0;
    let winningOutcome = 0;
    for (const [outcome, voteCount] of votes.entries()) {
      if (voteCount > maxVotes) {
        maxVotes = voteCount;
        winningOutcome = outcome;
      }
    }

    const confidence = (maxVotes / successfulResults.length) * 100;

    return {
      outcome: winningOutcome,
      confidence,
      source: `Consensus (${maxVotes}/${successfulResults.length})`,
      timestamp: Date.now(),
      proof: JSON.stringify(successfulResults),
    };
  }
}

/**
 * API Oracle - Uses external API endpoints to resolve markets
 */
export class APIOracle implements OracleProvider {
  name: string;
  private endpoint: string;

  constructor(name: string, endpoint: string) {
    this.name = name;
    this.endpoint = endpoint;
  }

  async resolve(marketId: string, question: string, outcomes: string[]): Promise<OracleResult> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ marketId, question, outcomes }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        outcome: data.outcome,
        confidence: data.confidence || 100,
        source: this.name,
        timestamp: data.timestamp || Date.now(),
        proof: data.proof,
      };
    } catch (error: any) {
      throw new Error(`API oracle error: ${error.message}`);
    }
  }
}

/**
 * Oracle Service - Main interface for market resolution
 */
export class OracleService {
  private providers: Map<string, OracleProvider>;
  private defaultProvider: string;

  constructor() {
    this.providers = new Map();
    this.defaultProvider = 'polymarket';

    // Register default providers
    this.registerProvider('polymarket', new PolymarketOracle());
    this.registerProvider('manual', new ManualOracle());
  }

  registerProvider(name: string, provider: OracleProvider) {
    this.providers.set(name.toLowerCase(), provider);
  }

  getProvider(name: string): OracleProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  async resolveMarket(
    marketId: string,
    question: string,
    outcomes: string[],
    providerName?: string
  ): Promise<OracleResult> {
    const provider = providerName
      ? this.getProvider(providerName)
      : this.getProvider(this.defaultProvider);

    if (!provider) {
      throw new Error(`Oracle provider not found: ${providerName || this.defaultProvider}`);
    }

    return provider.resolve(marketId, question, outcomes);
  }

  /**
   * Attempt to auto-resolve using multiple providers
   */
  async autoResolve(
    marketId: string,
    question: string,
    outcomes: string[]
  ): Promise<OracleResult> {
    // Try Polymarket first
    try {
      const polymarket = this.getProvider('polymarket');
      if (polymarket) {
        return await polymarket.resolve(marketId, question, outcomes);
      }
    } catch (error) {
      console.log('Polymarket oracle failed, trying fallbacks:', error);
    }

    // If Polymarket fails, require manual intervention
    throw new Error('Auto-resolution failed - manual resolution required');
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

// Singleton instance
export const oracleService = new OracleService();
