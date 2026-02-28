import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { mockPositions } from "@/data/mock-markets"
import { formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Briefcase, ExternalLink, TrendingUp, TrendingDown } from "lucide-react"

export default function PortfolioPage() {
  const openPositions = mockPositions.filter((p) => p.status === "open")
  const resolvedPositions = mockPositions.filter((p) => p.status === "resolved")

  const totalValue = mockPositions.reduce(
    (acc, p) => acc + p.shares * p.currentPrice,
    0
  )
  const totalPnl = mockPositions.reduce((acc, p) => acc + p.pnl, 0)
  const totalCost = mockPositions.reduce(
    (acc, p) => acc + p.shares * p.avgPrice,
    0
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Your positions, performance, and claimable winnings
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col p-4">
            <span className="text-xs text-muted-foreground">Portfolio Value</span>
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

      {/* Open Positions */}
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
                  {openPositions.map((pos) => (
                    <TableRow key={pos.marketId}>
                      <TableCell className="max-w-[200px]">
                        <Link
                          href={`/markets/${pos.marketId}`}
                          className="text-sm font-medium hover:text-primary transition-colors line-clamp-1"
                        >
                          {pos.marketTitle}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            pos.outcome === "Yes"
                              ? "bg-success/15 text-success"
                              : "bg-destructive/15 text-destructive"
                          )}
                        >
                          {pos.outcome}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {pos.shares.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatUSD(pos.avgPrice)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatUSD(pos.currentPrice)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-sm font-medium",
                          pos.pnl >= 0 ? "text-success" : "text-destructive"
                        )}
                      >
                        {pos.pnl >= 0 ? "+" : ""}
                        {formatUSD(pos.pnl)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/markets/${pos.marketId}`}>
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

      {/* Resolved Positions */}
      {resolvedPositions.length > 0 && (
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
                  {resolvedPositions.map((pos) => (
                    <TableRow key={pos.marketId}>
                      <TableCell className="max-w-[200px]">
                        <Link
                          href={`/markets/${pos.marketId}`}
                          className="text-sm font-medium hover:text-primary transition-colors line-clamp-1"
                        >
                          {pos.marketTitle}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {pos.outcome}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {pos.shares.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatUSD(pos.avgPrice)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatUSD(pos.currentPrice)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-sm font-medium",
                          pos.pnl >= 0 ? "text-success" : "text-destructive"
                        )}
                      >
                        {pos.pnl >= 0 ? "+" : ""}
                        {formatUSD(pos.pnl)}
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
      )}
    </div>
  )
}
