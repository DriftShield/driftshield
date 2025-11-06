/**
 * Hook to automatically track trades in portfolio
 */

import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { recordTrade, getOpenPositions } from '@/lib/portfolio/service';

export function usePortfolioTracking() {
  const { publicKey } = useWallet();

  /**
   * Track a bet placement as a BUY trade
   */
  const trackBetPlacement = (
    marketId: string,
    marketTitle: string,
    outcome: string,
    shares: number,
    price: number,
    fee: number = 0,
    txSignature?: string
  ) => {
    if (!publicKey) return;

    try {
      recordTrade(
        publicKey.toString(),
        marketId,
        marketTitle,
        outcome,
        'BUY',
        shares,
        price,
        fee,
        txSignature
      );
    } catch (error) {
      console.error('Error tracking bet placement:', error);
    }
  };

  /**
   * Track a bet sale/exit as a SELL trade
   */
  const trackBetSale = (
    marketId: string,
    marketTitle: string,
    outcome: string,
    shares: number,
    price: number,
    fee: number = 0,
    txSignature?: string
  ) => {
    if (!publicKey) return;

    try {
      recordTrade(
        publicKey.toString(),
        marketId,
        marketTitle,
        outcome,
        'SELL',
        shares,
        price,
        fee,
        txSignature
      );
    } catch (error) {
      console.error('Error tracking bet sale:', error);
    }
  };

  /**
   * Get current positions for user
   */
  const getPositions = () => {
    if (!publicKey) return [];
    return getOpenPositions(publicKey.toString());
  };

  return {
    trackBetPlacement,
    trackBetSale,
    getPositions,
  };
}
