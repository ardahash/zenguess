"use client"

import Link from "next/link"
import { CircleDollarSign, Info } from "lucide-react"
import { AddUsdceButton } from "@/components/wallet/add-usdce-button"

export function UsdceInfoPanel() {
  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
      <div className="flex items-start gap-2">
        <CircleDollarSign className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">USDC.e Collateral</p>
          <p className="text-xs text-muted-foreground">
            USDC.e is bridged USDC on Horizen with intended 1:1 USD value.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <AddUsdceButton />
            <Link
              href="/onramp"
              className="inline-flex items-center text-xs text-primary underline-offset-4 hover:underline"
            >
              Bridge USDC to Horizen
            </Link>
            <span className="inline-flex items-center text-[11px] text-muted-foreground">
              <Info className="mr-1 size-3" />
              Powered by Stargate + LayerZero
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
