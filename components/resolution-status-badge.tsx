"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, AlertTriangle, Shield, Sparkles } from "lucide-react"

interface ResolutionStatusBadgeProps {
  status: string
  disputeEndTime?: number | null
  className?: string
}

export function ResolutionStatusBadge({ status, disputeEndTime, className }: ResolutionStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "Pending":
        return {
          variant: "outline" as const,
          icon: <Clock className="w-3 h-3" />,
          label: "Pending Resolution",
          color: "text-muted-foreground"
        }
      case "OracleResolved":
        const hoursLeft = disputeEndTime ? Math.max(0, Math.floor((disputeEndTime - Date.now() / 1000) / 3600)) : 0
        return {
          variant: "secondary" as const,
          icon: <Sparkles className="w-3 h-3" />,
          label: `Oracle Resolved • ${hoursLeft}h to dispute`,
          color: "text-secondary"
        }
      case "Disputed":
        return {
          variant: "destructive" as const,
          icon: <AlertTriangle className="w-3 h-3" />,
          label: "Under Dispute",
          color: "text-destructive"
        }
      case "AdminResolved":
        return {
          variant: "default" as const,
          icon: <Shield className="w-3 h-3" />,
          label: "Admin Resolved",
          color: "text-primary"
        }
      case "Finalized":
        return {
          variant: "default" as const,
          icon: <CheckCircle className="w-3 h-3" />,
          label: "Finalized",
          color: "text-secondary"
        }
      default:
        return {
          variant: "outline" as const,
          icon: <Clock className="w-3 h-3" />,
          label: "Unknown Status",
          color: "text-muted-foreground"
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Badge variant={config.variant} className={`gap-1.5 ${className}`}>
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  )
}
