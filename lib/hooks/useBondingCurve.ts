import { useState, useEffect, useCallback } from 'react'
import { PredictionBondingCurve, Quote } from '@/lib/bonding-curve'

export function useBondingCurve(marketId: string, numOutcomes: number = 2) {
  const [curve, setCurve] = useState<PredictionBondingCurve | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize or load curve
  useEffect(() => {
    setIsLoading(true)

    // Try to load existing curve
    let loadedCurve = PredictionBondingCurve.load(marketId)

    // Create new if doesn't exist
    if (!loadedCurve) {
      loadedCurve = new PredictionBondingCurve(marketId, numOutcomes)
      loadedCurve.save()
    }

    setCurve(loadedCurve)
    setIsLoading(false)
  }, [marketId, numOutcomes])

  // Get quote for a bet
  const getQuote = useCallback((solAmount: number, outcomeIndex: number): Quote | null => {
    if (!curve || solAmount <= 0) {
      setQuote(null)
      return null
    }

    try {
      const q = curve.getQuote(solAmount, outcomeIndex)
      setQuote(q)
      return q
    } catch (error) {
      console.error('Failed to get quote:', error)
      setQuote(null)
      return null
    }
  }, [curve])

  // Execute a bet
  const executeBet = useCallback((solAmount: number, outcomeIndex: number): Quote | null => {
    if (!curve) return null

    try {
      const result = curve.buy(solAmount, outcomeIndex)
      curve.save()
      setCurve(curve.clone()) // Trigger re-render
      return result
    } catch (error) {
      console.error('Failed to execute bet:', error)
      return null
    }
  }, [curve])

  // Get current odds
  const getOdds = useCallback((): number[] => {
    if (!curve) return []
    return curve.getOdds()
  }, [curve])

  // Get graduation progress
  const getGraduationProgress = useCallback((): number => {
    if (!curve) return 0
    return curve.getGraduationProgress()
  }, [curve])

  // Refresh curve (useful after on-chain bet)
  const refresh = useCallback(() => {
    if (!curve) return
    setCurve(curve.clone())
  }, [curve])

  return {
    curve,
    quote,
    isLoading,
    getQuote,
    executeBet,
    getOdds,
    getGraduationProgress,
    refresh
  }
}
