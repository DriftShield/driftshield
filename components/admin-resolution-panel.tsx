"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, XCircle, Loader2, Shield } from "lucide-react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { AnchorProvider, Program } from "@coral-xyz/anchor"
import IDL from "@/lib/solana/prediction_bets_idl.json"
import { getMarketPDA } from "@/lib/solana/prediction-bets"
import { toast } from "sonner"

interface AdminResolutionPanelProps {
  marketId: string
  resolutionStatus: string
  disputed: boolean
  disputeReason?: string
  currentOutcome?: string
  isAdmin: boolean
}

export function AdminResolutionPanel({
  marketId,
  resolutionStatus,
  disputed,
  disputeReason,
  currentOutcome,
  isAdmin
}: AdminResolutionPanelProps) {
  const [loading, setLoading] = useState(false)
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()

  if (!isAdmin || resolutionStatus !== "Disputed" || !disputed) {
    return null
  }

  const handleAdminResolve = async (outcome: "Yes" | "No") => {
    if (!publicKey || !signTransaction) {
      toast.error("Please connect your wallet")
      return
    }

    setLoading(true)

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions: async (txs) => txs },
        { commitment: "confirmed" }
      )

      const program = new Program(IDL as any, provider)
      const [marketPDA] = getMarketPDA(marketId)

      const betOutcome = outcome === "Yes" ? { yes: {} } : { no: {} }

      const tx = await program.methods
        .adminFinalizeResolution(betOutcome)
        .accounts({
          market: marketPDA,
          authority: publicKey,
        })
        .rpc()

      toast.success(`Market resolved as ${outcome}!`)
      console.log("Admin resolution transaction:", tx)

      // Reload page after 2s
      setTimeout(() => window.location.reload(), 2000)
    } catch (error: any) {
      console.error("Error finalizing resolution:", error)
      toast.error(error?.message || "Failed to finalize resolution")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-2 border-destructive/50 bg-destructive/5 p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              Admin Action Required
              <Badge variant="destructive">Disputed</Badge>
            </h3>
            <p className="text-sm text-muted-foreground">
              This market resolution has been challenged
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border bg-background p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Dispute Reason
          </div>
          <p className="text-sm text-muted-foreground">
            {disputeReason || "No reason provided"}
          </p>
        </div>

        <div className="rounded-lg border bg-background p-4 space-y-2">
          <div className="text-sm font-semibold">Oracle Resolution</div>
          <div className="flex items-center gap-2">
            <Badge variant={currentOutcome === "Yes" ? "default" : "secondary"}>
              {currentOutcome || "Unknown"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              (Currently set by oracle)
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t">
        <p className="text-sm font-semibold">Select Final Outcome:</p>
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            variant="outline"
            className="h-auto flex-col gap-2 py-4 border-2 border-secondary hover:bg-secondary/20 hover:border-secondary"
            onClick={() => handleAdminResolve("Yes")}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <CheckCircle className="w-6 h-6 text-secondary" />
            )}
            <span className="font-bold text-lg">YES</span>
            <span className="text-xs text-muted-foreground">Resolve as YES</span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-auto flex-col gap-2 py-4 border-2 border-accent hover:bg-accent/20 hover:border-accent"
            onClick={() => handleAdminResolve("No")}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <XCircle className="w-6 h-6 text-accent" />
            )}
            <span className="font-bold text-lg">NO</span>
            <span className="text-xs text-muted-foreground">Resolve as NO</span>
          </Button>
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> Your decision as admin will override the oracle resolution and become final.
          Users will be able to claim their winnings based on your decision.
        </p>
      </div>
    </Card>
  )
}
