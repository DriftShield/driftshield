"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import { AnchorProvider, Program } from "@coral-xyz/anchor"
import IDL from "@/lib/solana/prediction_bets_idl.json"
import { getMarketPDA, PROGRAM_ID } from "@/lib/solana/prediction-bets"
import { toast } from "sonner"

interface DisputeDialogProps {
  marketId: string
  resolutionStatus: string
  disputeEndTime: number | null
}

export function DisputeDialog({ marketId, resolutionStatus, disputeEndTime }: DisputeDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()

  const canDispute = resolutionStatus === "OracleResolved" &&
                      disputeEndTime &&
                      Date.now() / 1000 < disputeEndTime

  const handleDispute = async () => {
    if (!publicKey || !signTransaction) {
      toast.error("Please connect your wallet")
      return
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for the dispute")
      return
    }

    if (reason.length > 500) {
      toast.error("Dispute reason must be 500 characters or less")
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

      const tx = await program.methods
        .disputeResolution(reason)
        .accounts({
          market: marketPDA,
          disputer: publicKey,
        })
        .rpc()

      toast.success("Resolution disputed successfully!")
      console.log("Dispute transaction:", tx)

      setOpen(false)
      setReason("")

      // Reload page after 2s to show updated status
      setTimeout(() => window.location.reload(), 2000)
    } catch (error: any) {
      console.error("Error disputing resolution:", error)
      toast.error(error?.message || "Failed to dispute resolution")
    } finally {
      setLoading(false)
    }
  }

  if (!canDispute) {
    return null
  }

  const hoursLeft = disputeEndTime ? Math.max(0, Math.floor((disputeEndTime - Date.now() / 1000) / 3600)) : 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <AlertTriangle className="w-4 h-4" />
          Challenge Resolution
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Dispute Market Resolution
          </DialogTitle>
          <DialogDescription>
            You have {hoursLeft} hours remaining to challenge this oracle resolution.
            Please provide a detailed reason for your dispute.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Dispute Reason</Label>
            <Textarea
              id="reason"
              placeholder="Explain why you believe the oracle resolution is incorrect..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[150px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {reason.length}/500 characters
            </p>
          </div>

          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-2">
            <h4 className="font-semibold text-sm">Important Notes:</h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Your dispute will be reviewed by the market admin</li>
              <li>• The admin will make the final decision on the resolution</li>
              <li>• Once the dispute period ends, resolution becomes final</li>
              <li>• Frivolous disputes may result in penalties</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDispute}
            disabled={loading || !reason.trim()}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Dispute
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
