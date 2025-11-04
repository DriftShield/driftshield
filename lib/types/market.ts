/**
 * Market Types - Unified interface for binary and multi-outcome markets
 */

export interface MarketOutcome {
  id: string;
  label: string;
  probability: number;
  price: number; // in cents (0-100)
  volume: number;
  polymarketMarketId?: string; // For linking to Polymarket sub-markets
}

export interface BaseMarket {
  id: string;
  question: string;
  description?: string;
  category: string;
  volume: number;
  liquidity: number;
  endDate: string;
  image?: string;
  active: boolean;
  isMultiOutcome: boolean;
}

export interface BinaryMarket extends BaseMarket {
  isMultiOutcome: false;
  outcomes: ['Yes', 'No'];
  probability: number; // Yes probability (0-1)
}

export interface MultiOutcomeMarket extends BaseMarket {
  isMultiOutcome: true;
  outcomes: MarketOutcome[];
  totalOutcomes: number;
}

export type Market = BinaryMarket | MultiOutcomeMarket;

/**
 * Type guards
 */
export function isBinaryMarket(market: Market): market is BinaryMarket {
  return !market.isMultiOutcome;
}

export function isMultiOutcomeMarket(market: Market): market is MultiOutcomeMarket {
  return market.isMultiOutcome;
}

/**
 * Polymarket Event Group Response
 */
export interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  markets: PolymarketMarket[];
  category: string;
  volume: number;
  liquidity: number;
}

export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  endDate: string;
  category: string;
  outcomes: string;
  outcomePrices: string;
  volume: string;
  active: boolean;
  closed: boolean;
}

/**
 * Convert Polymarket event to MultiOutcomeMarket
 */
export function polymarketEventToMarket(event: PolymarketEvent): MultiOutcomeMarket | null {
  // Only convert if event has multiple markets (multi-outcome)
  if (event.markets.length <= 1) {
    return null;
  }

  const outcomes: MarketOutcome[] = event.markets.map((market) => {
    const prices = JSON.parse(market.outcomePrices);
    const yesPrice = parseFloat(prices[0]);
    const volume = parseFloat(market.volume);

    return {
      id: market.id,
      label: market.question,
      probability: yesPrice,
      price: Math.round(yesPrice * 100),
      volume: volume,
      polymarketMarketId: market.id,
    };
  });

  return {
    id: event.id,
    question: event.title,
    description: event.description,
    category: event.category,
    volume: event.volume,
    liquidity: event.liquidity,
    endDate: event.endDate,
    image: event.image,
    active: event.active && !event.closed,
    isMultiOutcome: true,
    outcomes,
    totalOutcomes: outcomes.length,
  };
}

/**
 * Convert Polymarket single market to BinaryMarket
 */
export function polymarketMarketToBinary(market: PolymarketMarket): BinaryMarket {
  const prices = JSON.parse(market.outcomePrices);
  const yesPrice = parseFloat(prices[0]);
  const volume = parseFloat(market.volume);

  return {
    id: market.id,
    question: market.question,
    category: market.category,
    volume: volume,
    liquidity: volume, // Approximate
    endDate: market.endDate,
    active: market.active && !market.closed,
    isMultiOutcome: false,
    outcomes: ['Yes', 'No'],
    probability: yesPrice,
  };
}
