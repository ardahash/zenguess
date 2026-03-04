"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAccount, usePublicClient, useWalletClient } from "wagmi"
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { MarketEntity } from "@/services/markets"
import { resolveMarketOnchain } from "@/lib/contracts"
import { defaultChain } from "@/lib/chains"
import { isWrongNetwork } from "@/lib/web3"
import { formatDate } from "@/lib/format"
import { toUserFacingWeb3Error } from "@/lib/web3-errors"
import { toast } from "sonner"

interface MarketsResponse {
  data: MarketEntity[]
}

export default function ResolvePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { address, chainId, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient({ chainId: defaultChain.id })
  const publicClient = usePublicClient({ chainId: defaultChain.id })

  const [closedMarkets, setClosedMarkets] = useState<MarketEntity[]>([])
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [resolvingKey, setResolvingKey] = useState<string | null>(null)
  const [manualMarketId, setManualMarketId] = useState("")
  const [manualOutcome, setManualOutcome] = useState("0")

  const wrongNetwork = isConnected && isWrongNetwork(chainId)
  const canResolve = isConnected && !wrongNetwork && Boolean(walletClient && publicClient)

  const loadClosedMarkets = useCallback(async () => {
    try {
      setIsLoadingMarkets(true)
      setLoadError(null)
      const response = await fetch("/api/markets?status=closed&sort=ending_soon", {
        cache: "no-store",
      })
      if (!response.ok) {
        throw new Error("Failed to load closed markets.")
      }
      const payload = (await response.json()) as MarketsResponse
      setClosedMarkets(payload.data)
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load closed markets."
      )
    } finally {
      setIsLoadingMarkets(false)
    }
  }, [])

  useEffect(() => {
    void loadClosedMarkets()
  }, [loadClosedMarkets])

  useEffect(() => {
    const presetMarketId = searchParams.get("marketId")
    if (presetMarketId) {
      setManualMarketId(presetMarketId)
    }
  }, [searchParams])

  async function resolve(marketId: string, resolvedOutcome: number) {
    if (!canResolve || !walletClient || !publicClient) {
      toast.error(
        !isConnected
          ? "Connect wallet to resolve markets."
          : wrongNetwork
            ? `Switch to ${defaultChain.name} to resolve markets.`
            : "Wallet client is not ready. Please retry."
      )
      return
    }

    const key = `${marketId}:${resolvedOutcome}`
    setResolvingKey(key)
    try {
      const result = await resolveMarketOnchain(
        { walletClient, publicClient },
        { marketId, resolvedOutcome }
      )
      toast.success("Market resolved onchain", {
        description: `Tx: ${result.txHash.slice(0, 10)}...`,
      })
      await loadClosedMarkets()
      router.refresh()
    } catch (error) {
      toast.error(toUserFacingWeb3Error(error, "Failed to resolve market."))
    } finally {
      setResolvingKey(null)
    }
  }

  async function handleManualResolve() {
    const parsedOutcome = Number(manualOutcome)
    if (!manualMarketId.trim()) {
      toast.error("Enter a market ID.")
      return
    }
    if (!Number.isInteger(parsedOutcome) || parsedOutcome < 0) {
      toast.error("Resolved outcome must be a non-negative integer.")
      return
    }

    await resolve(manualMarketId.trim(), parsedOutcome)
  }

  const headerDescription = useMemo(() => {
    if (!isConnected) {
      return "Connect your resolver wallet to settle markets."
    }
    if (wrongNetwork) {
      return `Switch to ${defaultChain.name} to settle markets.`
    }
    if (!address) {
      return "Resolver wallet not available."
    }
    return `Connected resolver candidate: ${address}`
  }, [address, isConnected, wrongNetwork])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Resolve Markets</h1>
        <p className="text-sm text-muted-foreground">{headerDescription}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" />
            Manual Resolve
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manual-market-id">Market ID</Label>
            <Input
              id="manual-market-id"
              value={manualMarketId}
              onChange={(event) => setManualMarketId(event.target.value)}
              placeholder="e.g. 12"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manual-outcome">Winning Outcome Index</Label>
            <Input
              id="manual-outcome"
              type="number"
              min="0"
              value={manualOutcome}
              onChange={(event) => setManualOutcome(event.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleManualResolve}
              disabled={!canResolve || resolvingKey !== null}
            >
              {resolvingKey ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Resolving...
                </>
              ) : (
                "Resolve"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Closed Markets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoadingMarkets ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading closed markets...
            </div>
          ) : loadError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {loadError}
            </div>
          ) : closedMarkets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No closed markets pending resolution.
            </div>
          ) : (
            closedMarkets.map((market) => (
              <div key={market.id} className="rounded-lg border border-border p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Market #{market.id}</Badge>
                  <Badge variant="secondary">Ended {formatDate(market.endTime)}</Badge>
                </div>
                <p className="mb-3 text-sm font-medium">{market.question}</p>
                <div className="flex flex-wrap gap-2">
                  {market.outcomes.map((outcome, outcomeIndex) => {
                    const key = `${market.id}:${outcomeIndex}`
                    const isResolving = resolvingKey === key
                    return (
                      <Button
                        key={outcome.label}
                        size="sm"
                        variant="outline"
                        disabled={!canResolve || resolvingKey !== null}
                        onClick={() => void resolve(market.id, outcomeIndex)}
                      >
                        {isResolving ? (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-1.5 size-3.5" />
                        )}
                        Resolve as {outcome.label}
                      </Button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
