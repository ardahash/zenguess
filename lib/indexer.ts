import { clientEnv } from "@/lib/env/client"
import { marketRepository } from "@/services/markets"
import type { ActivityEvent, Market, Trade, UserPosition } from "@/data/types"

const GOLDSKY_ENDPOINT = clientEnv.NEXT_PUBLIC_GOLDSKY_ENDPOINT

async function fetchFromGoldsky<T>(query: string): Promise<T | null> {
  void query
  if (!GOLDSKY_ENDPOINT) {
    return null
  }

  // TODO: Replace with GraphQL requests when subgraph is available.
  return null
}

export async function fetchMarkets(): Promise<Market[]> {
  const fromIndexer = await fetchFromGoldsky<Market[]>("markets")
  if (fromIndexer) {
    return fromIndexer
  }
  return marketRepository.listMarkets()
}

export async function fetchMarketById(marketId: string): Promise<Market | null> {
  const fromIndexer = await fetchFromGoldsky<Market>(`market:${marketId}`)
  if (fromIndexer) {
    return fromIndexer
  }
  return marketRepository.getMarket(marketId)
}

export async function fetchTradesByMarket(marketId: string): Promise<Trade[]> {
  const fromIndexer = await fetchFromGoldsky<Trade[]>(`trades:${marketId}`)
  if (fromIndexer) {
    return fromIndexer
  }
  return marketRepository.listTradesByMarket(marketId)
}

export async function fetchActivityFeed(): Promise<ActivityEvent[]> {
  const fromIndexer = await fetchFromGoldsky<ActivityEvent[]>("activity")
  if (fromIndexer) {
    return fromIndexer
  }
  return marketRepository.listActivity()
}

export async function fetchUserPositions(
  userAddress: string
): Promise<UserPosition[]> {
  const fromIndexer = await fetchFromGoldsky<UserPosition[]>(
    `portfolio:${userAddress}`
  )
  if (fromIndexer) {
    return fromIndexer
  }
  return marketRepository.getPortfolio(userAddress)
}
