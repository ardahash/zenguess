"use client"

import { useState } from "react"
import { PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CONTRACT_ADDRESSES } from "@/lib/onchain/contracts"
import { clientEnv } from "@/lib/env/client"
import { toast } from "sonner"

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

export function AddUsdceButton() {
  const [isAdding, setIsAdding] = useState(false)
  const isMainnet = clientEnv.NEXT_PUBLIC_DEFAULT_CHAIN === "mainnet"
  const usdceAddress = isMainnet
    ? CONTRACT_ADDRESSES.mainnet.usdce.collateralToken
    : CONTRACT_ADDRESSES.testnet.usdce.collateralToken

  async function handleAddToken() {
    const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum
    if (!provider) {
      toast.error("No wallet provider found.")
      return
    }

    setIsAdding(true)
    try {
      const added = (await provider.request({
        method: "wallet_watchAsset",
        params: [
          {
            type: "ERC20",
            options: {
              address: usdceAddress,
              symbol: "USDC.e",
              decimals: 6,
            },
          },
        ],
      })) as boolean

      if (added) {
        toast.success("USDC.e added to wallet.")
      } else {
        toast.info("Token add request was dismissed.")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add token.")
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAddToken}
      disabled={isAdding}
      type="button"
    >
      <PlusCircle className="mr-1.5 size-3.5" />
      {isAdding ? "Adding..." : "Add USDC.e to MetaMask"}
    </Button>
  )
}
