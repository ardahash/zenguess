"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MarketCard } from "@/components/market-card"
import type { MarketCategory, MarketStatus } from "@/data/types"
import { cn } from "@/lib/utils"
import type { MarketEntity } from "@/services/markets"
import { Skeleton } from "@/components/ui/skeleton"

const categories: Array<{ value: MarketCategory | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "crypto", label: "Crypto" },
  { value: "politics", label: "Politics" },
  { value: "sports", label: "Sports" },
  { value: "science", label: "Science" },
  { value: "culture", label: "Culture" },
  { value: "economics", label: "Economics" },
]

const statusFilters: Array<{ value: MarketStatus | "all"; label: string }> = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
]

type SortOption = "volume" | "newest" | "ending_soon" | "liquidity"

export default function MarketsPage() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<MarketCategory | "all">("all")
  const [status, setStatus] = useState<MarketStatus | "all">("all")
  const [sort, setSort] = useState<SortOption>("volume")
  const [showFilters, setShowFilters] = useState(false)
  const [markets, setMarkets] = useState<MarketEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (category !== "all") {
          params.set("category", category)
        }
        if (status !== "all") {
          params.set("status", status)
        }
        params.set("sort", sort)
        if (search.trim()) {
          params.set("q", search.trim())
        }

        const response = await fetch(`/api/markets?${params.toString()}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("Failed to load markets.")
        }

        const payload: { data: MarketEntity[] } = await response.json()
        setMarkets(payload.data)
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load markets."
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [category, reloadNonce, search, sort, status])

  const hasFilters = useMemo(
    () => Boolean(search.trim() || category !== "all" || status !== "all"),
    [category, search, status]
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Markets</h1>
        <p className="text-sm text-muted-foreground">
          Browse and trade on prediction markets
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search markets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-accent")}
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filter by category">
          {categories.map((cat) => (
            <button
              key={cat.value}
              role="tab"
              aria-selected={category === cat.value}
              onClick={() => setCategory(cat.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                category === cat.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3">
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as MarketStatus | "all")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusFilters.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sort}
              onValueChange={(v) => setSort(v as SortOption)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="volume">Highest Volume</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="ending_soon">Ending Soon</SelectItem>
                <SelectItem value="liquidity">Most Liquidity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{markets.length} markets</Badge>
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearch("")}
            className="text-xs"
          >
            Clear search
          </Button>
        )}
      </div>

      {/* Market grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-lg border p-4">
              <Skeleton className="mb-3 h-5 w-24" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-4 h-4 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 py-16 text-center">
          <p className="text-sm font-medium text-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setReloadNonce((current) => current + 1)
            }}
          >
            Retry
          </Button>
        </div>
      ) : markets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium text-foreground">
            {hasFilters ? "No markets found" : "No markets yet"}
          </p>
          <p className="text-xs text-muted-foreground">
            {hasFilters
              ? "Try adjusting your filters or search query"
              : "Markets will appear here once created."}
          </p>
        </div>
      )}
    </div>
  )
}
