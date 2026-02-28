// Indexer abstraction layer
// Currently returns mock data. Will be replaced with Goldsky subgraph queries.

// TODO: Goldsky subgraph will power this module.
// The subgraph will index events from the MarketFactory and ConditionalTokens contracts.
// Queries will be made via GraphQL to the Goldsky endpoint.

import type { Market, Trade, ActivityEvent } from "@/data/types"

const GOLDSKY_ENDPOINT = process.env.NEXT_PUBLIC_GOLDSKY_ENDPOINT || ""

export async function fetchMarkets(): Promise<Market[]> {
  // TODO: Replace with Goldsky subgraph query:
  // query { markets(orderBy: volume, orderDirection: desc) { id, question, ... } }
  if (GOLDSKY_ENDPOINT) {
    // Real implementation would go here
    console.log("[ZenGuess] Would fetch from Goldsky:", GOLDSKY_ENDPOINT)
  }

  // For now, import mock data
  const { mockMarkets } = await import("@/data/mock-markets")
  return mockMarkets
}

export async function fetchMarketById(
  marketId: string
): Promise<Market | null> {
  // TODO: Replace with Goldsky subgraph query:
  // query { market(id: $id) { id, question, ... } }
  const { mockMarkets } = await import("@/data/mock-markets")
  return mockMarkets.find((m) => m.id === marketId) || null
}

export async function fetchTradesByMarket(
  marketId: string
): Promise<Trade[]> {
  // TODO: Replace with Goldsky subgraph query:
  // query { trades(where: { market: $marketId }) { ... } }
  const { mockTrades } = await import("@/data/mock-markets")
  return mockTrades.filter((t) => t.marketId === marketId)
}

export async function fetchActivityFeed(): Promise<ActivityEvent[]> {
  // TODO: Replace with Goldsky subgraph query:
  // query { events(orderBy: timestamp, orderDirection: desc) { ... } }
  const { mockActivity } = await import("@/data/mock-markets")
  return mockActivity
}

export async function fetchUserPositions(
  _userAddress: string
): Promise<
  Array<{
    marketId: string
    marketTitle: string
    outcome: string
    shares: number
    avgPrice: number
    currentPrice: number
    pnl: number
    status: "open" | "resolved"
  }>
> {
  // TODO: Derive from on-chain ConditionalTokens balances
  const { mockPositions } = await import("@/data/mock-markets")
  return mockPositions
}
