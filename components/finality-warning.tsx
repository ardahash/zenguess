"use client"

import { AlertTriangle } from "lucide-react"

export function FinalityWarning() {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
        <p className="text-xs text-muted-foreground">
          Horizen L3 withdrawals and cross-domain proofs can be delayed by an OP
          Stack challenge window. Treat high-value actions as non-instant final.
        </p>
      </div>
    </div>
  )
}
