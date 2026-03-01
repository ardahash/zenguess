"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Clock, Droplets, Info, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { OddsChart } from "@/components/odds-chart"
import { TradePanel } from "@/components/trade-panel"
import type { Market, Trade } from "@/data/types"
import {
  formatAddress,
  formatDate,
  formatDatetime,
  formatTimeRemaining,
  formatUSD,
} from "@/lib/format"
import { cn } from "@/lib/utils"

interface MarketPayload {
  data: Market
  related: {
    trades: Trade[]
  }
}

export default function MarketDetailPage() {
  const params = useParams<{ marketId: string }>()
  const marketId = params.marketId
  const [market, setMarket] = useState<Market | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    async function loadMarket() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/markets/${marketId}`, {
          signal: controller.signal,
        })

        if (response.status === 404) {
          throw new Error("Market not found.")
        }
        if (!response.ok) {
          throw new Error("Failed to load market.")
        }

        const payload: MarketPayload = await response.json()
        if (!active) {
          return
        }

        setMarket(payload.data)
        setTrades(payload.related.trades)
      } catch (loadError) {
        if (!active || controller.signal.aborted) {
          return
        }
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load market."
        )
      } finally {
        if (active && !controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadMarket()

    return () => {
      active = false
      controller.abort()
    }
  }, [marketId])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Skeleton className="h-8 w-full max-w-2xl" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (error || !market) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm font-medium">{error ?? "Market not found."}</p>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/markets">Back to Markets</Link>
        </Button>
      </div>
    )
  }

  const yesProb = market.outcomes[0]?.probability ?? 0.5
  const noProb = market.outcomes[1]?.probability ?? 0.5

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/markets">
            <ArrowLeft className="mr-1 size-3.5" />
            Back to Markets
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {market.category}
              </Badge>
              <Badge
                variant={market.status === "resolved" ? "default" : "outline"}
                className={cn(
                  market.status === "resolved" && "bg-success text-success-foreground"
                )}
              >
                {market.status}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" />
                {formatTimeRemaining(market.endTime)}
              </span>
            </div>
            <h1
              className="text-xl font-bold leading-snug text-balance md:text-2xl"
              data-testid="market-detail-title"
            >
              {market.question}
            </h1>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingUp className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Volume:</span>
              <span className="font-medium">{formatUSD(market.volume)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Droplets className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Liquidity:</span>
              <span className="font-medium">{formatUSD(market.liquidity)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Ends:</span>
              <span className="font-medium">{formatDate(market.endTime)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 rounded-lg border-2 border-success/30 bg-success/5 p-4 text-center">
              <div className="text-3xl font-bold text-success">
                {Math.round(yesProb * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">
                {market.outcomes[0]?.label ?? "Yes"}
              </div>
            </div>
            <div className="flex-1 rounded-lg border-2 border-destructive/30 bg-destructive/5 p-4 text-center">
              <div className="text-3xl font-bold text-destructive">
                {Math.round(noProb * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">
                {market.outcomes[1]?.label ?? "No"}
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Price History</CardTitle>
            </CardHeader>
            <CardContent>
              <OddsChart
                startProb={Math.max(0.1, yesProb - 0.15)}
                endProb={yesProb}
                days={30}
              />
            </CardContent>
          </Card>

          <Tabs defaultValue="activity">
            <TabsList>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              {trades.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trader</TableHead>
                        <TableHead>Side</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead className="text-right">Shares</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trades.map((trade) => (
                        <TableRow key={trade.id}>
                          <TableCell className="font-mono text-xs">
                            {formatAddress(trade.traderAddress)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={trade.side === "buy" ? "default" : "secondary"}
                              className={cn(
                                "text-xs capitalize",
                                trade.side === "buy"
                                  ? "bg-success/15 text-success"
                                  : "bg-destructive/15 text-destructive"
                              )}
                            >
                              {trade.side}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {trade.outcomeLabel}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {trade.shares.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatUSD(trade.price)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatUSD(trade.total)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDatetime(trade.timestamp)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  No trades yet for this market
                </div>
              )}
            </TabsContent>

            <TabsContent value="about">
              <Card>
                <CardContent className="flex flex-col gap-4 pt-6">
                  <div>
                    <h3 className="mb-1 text-sm font-semibold">Description</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {market.description}
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-1 text-sm font-semibold">
                      Resolution Source
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {market.resolutionSource}
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-1 text-sm font-semibold">Creator</h3>
                    <p className="font-mono text-xs text-muted-foreground">
                      {market.creatorAddress}
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-1 text-sm font-semibold">Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {market.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 size-4 shrink-0 text-warning" />
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Finality and withdrawals may be delayed by OP Stack
                        challenge windows. Do not treat high-value actions as
                        instantly final.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="w-full shrink-0 lg:sticky lg:top-20 lg:w-[320px] lg:self-start">
          <TradePanel market={market} />
        </div>
      </div>
    </div>
  )
}
