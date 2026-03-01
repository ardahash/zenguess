"use client"

import { useEffect, useState, type ElementType } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  CheckCircle2,
  Droplets,
  ExternalLink,
  PlusCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { ActivityEvent, ActivityEventType } from "@/data/types"
import { defaultChain, getExplorerTxUrl } from "@/lib/chains"
import { formatAddress, formatDatetime } from "@/lib/format"
import { cn } from "@/lib/utils"

const eventIcons: Record<ActivityEventType, ElementType> = {
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
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    async function loadActivity() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch("/api/activity", { signal: controller.signal })
        if (!response.ok) {
          throw new Error("Failed to load activity feed.")
        }

        const payload: { data: ActivityEvent[] } = await response.json()
        if (active) {
          setEvents(payload.data)
        }
      } catch (loadError) {
        if (!active || controller.signal.aborted) {
          return
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load activity."
        )
      } finally {
        if (active && !controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadActivity()

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Real-time feed of trades, market events, and liquidity changes
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-2 p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm">{error}</CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No activity yet.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event) => {
            const Icon = eventIcons[event.type]
            return (
              <Card key={event.id}>
                <CardContent className="flex items-start gap-3 p-4">
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      eventColors[event.type]
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
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
                      className="line-clamp-1 text-sm font-medium leading-snug text-foreground transition-colors hover:text-primary"
                    >
                      {event.marketTitle}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="font-mono">{formatAddress(event.actor)}</span>
                      <a
                        href={getExplorerTxUrl(event.txHash, defaultChain)}
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
      )}
    </div>
  )
}
