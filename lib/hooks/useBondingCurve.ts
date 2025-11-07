import { useState, useEffect, useCallback } from 'react'
import { PredictionBondingCurve, Quote } from '@/lib/bonding-curve'
import { useConnection } from '@solana/wallet-adapter-react'
import { getMarketPDA, PROGRAM_ID } from '@/lib/solana/prediction-bets'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import IDL from '@/lib/solana/prediction_bets_idl.json'

export function useBondingCurve(marketId: string, numOutcomes: number = 2) {
  const [curve, setCurve] = useState<PredictionBondingCurve | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { connection } = useConnection()

  // Fetch on-chain market data and sync curve
  const syncWithOnChain = useCallback(async () => {
    try {
      const [marketPDA] = getMarketPDA(marketId)

      // Create a dummy wallet for read-only operations
      const dummyWallet = {
        publicKey: marketPDA,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      }

      const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' })
      const program = new Program(IDL as any, provider)

      const marketAccount = await program.account.market.fetch(marketPDA)

      // Update curve with on-chain data
      let loadedCurve = PredictionBondingCurve.load(marketId)
      if (!loadedCurve) {
        loadedCurve = new PredictionBondingCurve(marketId, numOutcomes)
      }

      // Sync outcome amounts from on-chain
      const outcomeAmounts = (marketAccount as any).outcomeAmounts
      for (let i = 0; i < numOutcomes && i < outcomeAmounts.length; i++) {
        loadedCurve.outcomeSupplies[i] = outcomeAmounts[i].toNumber() / 1e9 // Convert from lamports
      }

      loadedCurve.totalVolume = (marketAccount as any).curveTotalVolume.toNumber() / 1e9
      loadedCurve.graduated = (marketAccount as any).curveGraduated

      loadedCurve.save()
      setCurve(loadedCurve)

      return true
    } catch (error) {
      console.error('[Bonding Curve] Failed to sync with on-chain:', error)
      return false
    }
  }, [marketId, numOutcomes, connection])

  // Initialize or load curve
  useEffect(() => {
    setIsLoading(true)

    // Try to sync with on-chain first
    syncWithOnChain().then((synced) => {
      if (!synced) {
        // Fallback to local or create new
        let loadedCurve = PredictionBondingCurve.load(marketId)
        if (!loadedCurve) {
          loadedCurve = new PredictionBondingCurve(marketId, numOutcomes)
          loadedCurve.save()
        }
        setCurve(loadedCurve)
      }
      setIsLoading(false)
    })
  }, [marketId, numOutcomes, syncWithOnChain])

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
  const refresh = useCallback(async () => {
    await syncWithOnChain()
  }, [syncWithOnChain])

  return {
    curve,
    quote,
    isLoading,
    getQuote,
    executeBet,
    getOdds,
    getGraduationProgress,
    refresh,
    syncWithOnChain
  }
}
