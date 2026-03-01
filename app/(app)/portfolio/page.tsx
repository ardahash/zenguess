"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAccount } from "wagmi"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { UserPosition } from "@/data/types"
import { formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  Briefcase,
  ExternalLink,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

const fallbackAddress = "0x1000000000000000000000000000000000000001"

export default function PortfolioPage() {
  const { address, isConnected } = useAccount()
  const [positions, setPositions] = useState<UserPosition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const portfolioAddress = address ?? fallbackAddress

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function loadPortfolio() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(
          `/api/portfolio?address=${encodeURIComponent(portfolioAddress)}`,
          { signal: controller.signal }
        )
        if (!response.ok) {
          throw new Error("Failed to load portfolio.")
        }
        const payload: { data: UserPosition[] } = await response.json()
        if (active) {
          setPositions(payload.data)
        }
      } catch (loadError) {
        if (!active || controller.signal.aborted) {
          return
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load portfolio."
        )
      } finally {
        if (active && !controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadPortfolio()

    return () => {
      active = false
      controller.abort()
    }
  }, [portfolioAddress])

  const openPositions = useMemo(
    () => positions.filter((position) => position.status === "open"),
    [positions]
  )
  const resolvedPositions = useMemo(
    () => positions.filter((position) => position.status === "resolved"),
    [positions]
  )
  const totalValue = useMemo(
    () =>
      positions.reduce(
        (accumulator, position) =>
          accumulator + position.shares * position.currentPrice,
        0
      ),
    [positions]
  )
  const totalPnl = useMemo(
    () =>
      positions.reduce(
        (accumulator, position) => accumulator + position.pnl,
        0
      ),
    [positions]
  )
  const totalCost = useMemo(
    () =>
      positions.reduce(
        (accumulator, position) =>
          accumulator + position.shares * position.avgPrice,
        0
      ),
    [positions]
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Your positions, performance, and claimable winnings
        </p>
        {!isConnected ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Wallet not connected. Showing demo portfolio data.
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-2 p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm">{error}</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="flex flex-col p-4">
                <span className="text-xs text-muted-foreground">
                  Portfolio Value
                </span>
                <span className="text-xl font-bold">{formatUSD(totalValue)}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col p-4">
                <span className="text-xs text-muted-foreground">Total Cost</span>
                <span className="text-xl font-bold">{formatUSD(totalCost)}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col p-4">
                <span className="text-xs text-muted-foreground">Total P&L</span>
                <span
                  className={cn(
                    "flex items-center gap-1 text-xl font-bold",
                    totalPnl >= 0 ? "text-success" : "text-destructive"
                  )}
                >
                  {totalPnl >= 0 ? (
                    <TrendingUp className="size-4" />
                  ) : (
                    <TrendingDown className="size-4" />
                  )}
                  {totalPnl >= 0 ? "+" : ""}
                  {formatUSD(totalPnl)}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col p-4">
                <span className="text-xs text-muted-foreground">
                  Active Positions
                </span>
                <span className="text-xl font-bold">{openPositions.length}</span>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="size-4" />
                Open Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {openPositions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Market</TableHead>
                        <TableHead>Side</TableHead>
                        <TableHead className="text-right">Shares</TableHead>
                        <TableHead className="text-right">Avg Price</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">P&L</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openPositions.map((position) => (
                        <TableRow key={position.marketId}>
                          <TableCell className="max-w-[200px]">
                            <Link
                              href={`/markets/${position.marketId}`}
                              className="line-clamp-1 text-sm font-medium transition-colors hover:text-primary"
                            >
                              {position.marketTitle}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs",
                                position.outcome === "Yes"
                                  ? "bg-success/15 text-success"
                                  : "bg-destructive/15 text-destructive"
                              )}
                            >
                              {position.outcome}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {position.shares.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatUSD(position.avgPrice)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatUSD(position.currentPrice)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right text-sm font-medium",
                              position.pnl >= 0 ? "text-success" : "text-destructive"
                            )}
                          >
                            {position.pnl >= 0 ? "+" : ""}
                            {formatUSD(position.pnl)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/markets/${position.marketId}`}>
                                <ExternalLink className="size-3.5" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <Briefcase className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No open positions yet
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/markets">Browse Markets</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {resolvedPositions.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Resolved Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Market</TableHead>
                        <TableHead>Side</TableHead>
                        <TableHead className="text-right">Shares</TableHead>
                        <TableHead className="text-right">Avg Price</TableHead>
                        <TableHead className="text-right">Result</TableHead>
                        <TableHead className="text-right">P&L</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resolvedPositions.map((position) => (
                        <TableRow key={`${position.marketId}-resolved`}>
                          <TableCell className="max-w-[200px]">
                            <Link
                              href={`/markets/${position.marketId}`}
                              className="line-clamp-1 text-sm font-medium transition-colors hover:text-primary"
                            >
                              {position.marketTitle}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {position.outcome}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {position.shares.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatUSD(position.avgPrice)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatUSD(position.currentPrice)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right text-sm font-medium",
                              position.pnl >= 0 ? "text-success" : "text-destructive"
                            )}
                          >
                            {position.pnl >= 0 ? "+" : ""}
                            {formatUSD(position.pnl)}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="default">
                              Claim
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  )
}
