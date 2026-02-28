import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { mockActivity } from "@/data/mock-markets"
import { formatAddress, formatDatetime } from "@/lib/format"
import {
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  CheckCircle2,
  Droplets,
  ExternalLink,
} from "lucide-react"
import type { ActivityEventType } from "@/data/types"
import { cn } from "@/lib/utils"

const eventIcons: Record<ActivityEventType, React.ElementType> = {
  trade: ArrowUpRight,
  market_created: PlusCircle,
  market_resolved: CheckCircle2,
  liquidity_added: Droplets,
}

const eventColors: Record<ActivityEventType, string> = {
  trade: "bg-primary/10 text-primary",
  market_created: "bg-chart-3/10 text-chart-3",
  market_resolved: "bg-success/10 text-success",
  liquidity_added: "bg-chart-4/10 text-chart-4",
}

const eventLabels: Record<ActivityEventType, string> = {
  trade: "Trade",
  market_created: "Created",
  market_resolved: "Resolved",
  liquidity_added: "Liquidity",
}

export default function ActivityPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Real-time feed of trades, market events, and liquidity changes
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {mockActivity.map((event) => {
          const Icon = eventIcons[event.type]
          return (
            <Card key={event.id}>
              <CardContent className="flex items-start gap-3 p-4">
                {/* Icon */}
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    eventColors[event.type]
                  )}
                >
                  <Icon className="size-4" />
                </div>

                {/* Content */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase tracking-wider"
                    >
                      {eventLabels[event.type]}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDatetime(event.timestamp)}
                    </span>
                  </div>
                  <Link
                    href={`/markets/${event.marketId}`}
                    className="text-sm font-medium leading-snug text-foreground hover:text-primary transition-colors line-clamp-1"
                  >
                    {event.marketTitle}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {event.description}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="font-mono">
                      {formatAddress(event.actor)}
                    </span>
                    <a
                      href={`https://horizen.calderaexplorer.xyz/tx/${event.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-0.5 text-primary hover:underline"
                    >
                      Tx
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
