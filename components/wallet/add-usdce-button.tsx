"use client"

import { useState } from "react"
import { PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CONTRACT_ADDRESSES } from "@/lib/onchain/contracts"
import { clientEnv } from "@/lib/env/client"
import { toast } from "sonner"
import { useAccount } from "wagmi"
import { horizenMainnet, horizenTestnet } from "@/lib/chains"

type EthereumProvider = {
  request: (args: {
    method: string
    params?: unknown[] | Record<string, unknown>
  }) => Promise<unknown>
}

export function AddUsdceButton() {
  const [isAdding, setIsAdding] = useState(false)
  const { chainId } = useAccount()
  const isMainnet =
    chainId === horizenMainnet.id
      ? true
      : chainId === horizenTestnet.id
        ? false
        : clientEnv.NEXT_PUBLIC_DEFAULT_CHAIN === "mainnet"
  const usdceAddress = isMainnet
    ? CONTRACT_ADDRESSES.mainnet.usdce.collateralToken
    : CONTRACT_ADDRESSES.testnet.usdce.collateralToken

  async function handleAddToken() {
    const provider = (window as Window & { ethereum?: EthereumProvider }).ethereum
    if (!provider) {
      toast.error("No wallet provider found.")
      return
    }
    if (
      !isMainnet &&
      usdceAddress.toLowerCase() ===
        CONTRACT_ADDRESSES.testnet.eth.collateralToken.toLowerCase()
    ) {
      toast.error("USDC.e token address is not configured on testnet yet.")
      return
    }

    setIsAdding(true)
    try {
      const assetPayload = {
        type: "ERC20",
        options: {
          address: usdceAddress,
          symbol: "USDC.e",
          decimals: 6,
          image: `${window.location.origin}/logo.jpg`,
        },
      }

      let added: boolean
      try {
        added = (await provider.request({
          method: "wallet_watchAsset",
          params: assetPayload,
        })) as boolean
      } catch (watchAssetError) {
        const message =
          watchAssetError instanceof Error
            ? watchAssetError.message.toLowerCase()
            : ""
        const shouldRetryWithArrayParams =
          message.includes("invalid params") || message.includes("tokenid")

        if (!shouldRetryWithArrayParams) {
          throw watchAssetError
        }

        added = (await provider.request({
          method: "wallet_watchAsset",
          params: [assetPayload],
        })) as boolean
      }

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
