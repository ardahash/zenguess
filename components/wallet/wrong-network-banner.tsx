"use client"

import { AlertTriangle } from "lucide-react"
import { useAccount, useSwitchChain } from "wagmi"
import { Button } from "@/components/ui/button"
import { defaultChain } from "@/lib/chains"
import { isWrongNetwork } from "@/lib/web3"

export function WrongNetworkBanner() {
  const { chainId, isConnected } = useAccount()
  const { switchChainAsync, isPending } = useSwitchChain()
  const show = isConnected && isWrongNetwork(chainId)

  if (!show) {
    return null
  }

  return (
    <div className="border-b border-warning/30 bg-warning/10 px-4 py-2">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 text-sm">
        <AlertTriangle className="size-4 text-warning" />
        <p className="text-warning-foreground">
          Wrong network detected. Switch to {defaultChain.name} to trade.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={async () => switchChainAsync({ chainId: defaultChain.id })}
          disabled={isPending}
        >
          {isPending ? "Switching..." : `Switch to ${defaultChain.name}`}
        </Button>
      </div>
    </div>
  )
}
