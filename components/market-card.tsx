import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { Market } from "@/data/types"
import { formatCollateralCompact } from "@/lib/collateral-format"
import { formatTimeRemaining } from "@/lib/format"
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

const outcomeBarColors = [
  "bg-success",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-primary",
  "bg-warning",
  "bg-destructive",
]

export function MarketCard({ market }: { market: Market }) {
  const outcomes =
    market.outcomes.length > 0
      ? market.outcomes
      : [{ label: "Outcome 1", probability: 1 }]
  const rawProbabilities = outcomes.map((outcome) =>
    Number.isFinite(outcome.probability)
      ? Math.max(0, outcome.probability)
      : 0
  )
  const totalProbability = rawProbabilities.reduce(
    (total, value) => total + value,
    0
  )
  const normalizedProbabilities =
    totalProbability > 0
      ? rawProbabilities.map((value) => (value / totalProbability) * 100)
      : outcomes.map(() => 100 / outcomes.length)
  const hasBinaryOutcomes = outcomes.length === 2
  const primaryOutcome = outcomes[0] ?? { label: "Outcome 1", probability: 0.5 }
  const secondaryOutcome = outcomes[1] ?? { label: "Outcome 2", probability: 0.5 }
  const primaryPercent = Math.round(normalizedProbabilities[0] ?? 50)
  const secondaryPercent = Math.round(normalizedProbabilities[1] ?? 50)

  return (
    <Link
      href={`/markets/${market.id}`}
      prefetch={false}
      className="group block"
      data-testid={`market-card-${market.id}`}
    >
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

          {/* Odds */}
          <div className="mb-3">
            {hasBinaryOutcomes ? (
              <>
                <div className="mb-1 flex items-center justify-between text-xs font-medium">
                  <span className="text-success">
                    {primaryOutcome.label} {primaryPercent}%
                  </span>
                  <span className="text-destructive">
                    {secondaryOutcome.label} {secondaryPercent}%
                  </span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="rounded-l-full bg-success transition-all"
                    style={{ width: `${primaryPercent}%` }}
                  />
                  <div
                    className="rounded-r-full bg-destructive transition-all"
                    style={{ width: `${secondaryPercent}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="mb-1 flex h-2 overflow-hidden rounded-full bg-muted">
                  {outcomes.map((outcome, index) => (
                    <div
                      key={`${outcome.label}-${index}`}
                      className={cn(
                        "transition-all",
                        outcomeBarColors[index % outcomeBarColors.length]
                      )}
                      style={{ width: `${normalizedProbabilities[index] ?? 0}%` }}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                  {outcomes.map((outcome, index) => (
                    <span
                      key={`${outcome.label}-${index}-label`}
                      className="truncate text-muted-foreground"
                    >
                      {outcome.label}{" "}
                      {Math.round(normalizedProbabilities[index] ?? 0)}%
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="size-3" />
              {formatCollateralCompact(market.volume)} vol
            </span>
            <span className="flex items-center gap-1">
              <Droplets className="size-3" />
              {formatCollateralCompact(market.liquidity)} liq
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
