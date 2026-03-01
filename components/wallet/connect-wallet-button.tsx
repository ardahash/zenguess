"use client"

import { Loader2, Wallet } from "lucide-react"
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi"
import { Button } from "@/components/ui/button"
import { defaultChain, getExplorerAddressUrl, getChainById } from "@/lib/chains"
import { formatAddress } from "@/lib/format"
import { isWrongNetwork } from "@/lib/web3"

interface ConnectWalletButtonProps {
  compact?: boolean
}

export function ConnectWalletButton({ compact = false }: ConnectWalletButtonProps) {
  const { address, chainId, isConnected } = useAccount()
  const { connect, connectors, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()
  const wrongNetwork = isConnected && isWrongNetwork(chainId)

  if (isConnected && address) {
    const chain = getChainById(chainId ?? defaultChain.id) ?? defaultChain
    return (
      <div className="flex items-center gap-2">
        <a
          href={getExplorerAddressUrl(address, chain)}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-md border border-border px-3 py-1.5 text-xs font-mono text-foreground transition-colors hover:bg-accent"
          title={address}
          data-testid="connected-address"
        >
          {formatAddress(address)}
        </a>
        {wrongNetwork ? (
          <Button
            size="sm"
            variant="outline"
            disabled={isSwitching}
            onClick={async () => {
              await switchChainAsync({ chainId: defaultChain.id })
            }}
          >
            {isSwitching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Switch Network"
            )}
          </Button>
        ) : null}
        {!compact ? (
          <Button size="sm" variant="ghost" onClick={() => disconnect()}>
            Disconnect
          </Button>
        ) : null}
      </div>
    )
  }

  const primaryConnector =
    connectors.find((connector) => connector.id === "mock") ??
    connectors.find((connector) => connector.ready) ??
    connectors[0]

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        className="inline-flex"
        onClick={() => {
          if (primaryConnector) {
            connect({ connector: primaryConnector })
          }
        }}
        disabled={!primaryConnector || isPending}
        data-testid="connect-wallet-button"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-1.5 size-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="mr-1.5 size-4" />
            Connect Wallet
          </>
        )}
      </Button>
      {error ? (
        <p className="max-w-[180px] text-xs text-destructive">{error.message}</p>
      ) : null}
    </div>
  )
}
