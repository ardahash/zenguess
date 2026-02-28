import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { Market } from "@/data/types"
import { formatCompactNumber, formatTimeRemaining } from "@/lib/format"
import { Clock, TrendingUp, Droplets } from "lucide-react"
import { cn } from "@/lib/utils"

const categoryColors: Record<string, string> = {
  crypto: "bg-chart-1/15 text-chart-1",
  politics: "bg-chart-3/15 text-chart-3",
  sports: "bg-chart-4/15 text-chart-4",
  science: "bg-chart-5/15 text-chart-5",
  culture: "bg-primary/15 text-primary",
  economics: "bg-chart-2/15 text-chart-2",
  other: "bg-muted text-muted-foreground",
}

export function MarketCard({ market }: { market: Market }) {
  const yesOutcome = market.outcomes[0]
  const noOutcome = market.outcomes[1]
  const yesPercent = Math.round(yesOutcome.probability * 100)
  const noPercent = Math.round(noOutcome.probability * 100)

  return (
    <Link href={`/markets/${market.id}`} className="group block">
      <Card className="transition-all hover:border-primary/30 hover:shadow-md">
        <CardContent className="p-4">
          {/* Header */}
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs capitalize",
                  categoryColors[market.category]
                )}
              >
                {market.category}
              </Badge>
              {market.status === "resolved" && (
                <Badge variant="default" className="bg-success text-success-foreground text-xs">
                  Resolved
                </Badge>
              )}
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {formatTimeRemaining(market.endTime)}
            </span>
          </div>

          {/* Question */}
          <h3 className="mb-3 line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
            {market.question}
          </h3>

          {/* Odds bar */}
          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between text-xs font-medium">
              <span className="text-success">
                {yesOutcome.label} {yesPercent}%
              </span>
              <span className="text-destructive">
                {noOutcome.label} {noPercent}%
              </span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="rounded-l-full bg-success transition-all"
                style={{ width: `${yesPercent}%` }}
              />
              <div
                className="rounded-r-full bg-destructive transition-all"
                style={{ width: `${noPercent}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="size-3" />
              ${formatCompactNumber(market.volume)} vol
            </span>
            <span className="flex items-center gap-1">
              <Droplets className="size-3" />
              ${formatCompactNumber(market.liquidity)} liq
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
