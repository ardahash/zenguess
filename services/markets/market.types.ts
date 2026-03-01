export type IsoDateString = string
export type Address = `0x${string}` | string

export type MarketStatus = "open" | "closed" | "resolved"
export type MarketCategory =
  | "crypto"
  | "politics"
  | "sports"
  | "science"
  | "culture"
  | "economics"
  | "other"

export interface MarketOutcome {
  label: string
  probability: number
}

export interface MarketEntity {
  id: string
  question: string
  description: string
  category: MarketCategory
  status: MarketStatus
  outcomes: MarketOutcome[]
  endTime: IsoDateString
  createdAt: IsoDateString
  volume: number
  liquidity: number
  resolvedOutcome?: number
  resolutionSource: string
  tags: string[]
  creatorAddress: Address
}

export interface TradeEntity {
  id: string
  marketId: string
  traderAddress: Address
  outcomeIndex: number
  outcomeLabel: string
  side: "buy" | "sell"
  shares: number
  price: number
  total: number
  timestamp: IsoDateString
  txHash: `0x${string}`
}

export type ActivityEventType =
  | "trade"
  | "market_created"
  | "market_resolved"
  | "liquidity_added"

export interface ActivityEventEntity {
  id: string
  type: ActivityEventType
  marketId: string
  marketTitle: string
  description: string
  actor: Address
  timestamp: IsoDateString
  txHash: `0x${string}`
  metadata?: Record<string, unknown>
}

export interface PortfolioPositionEntity {
  marketId: string
  marketTitle: string
  outcome: string
  shares: number
  avgPrice: number
  currentPrice: number
  pnl: number
  status: "open" | "resolved"
}

export type MarketSort = "volume" | "newest" | "ending_soon" | "liquidity"

export interface ListMarketsFilters {
  category?: MarketCategory | "all"
  status?: MarketStatus | "all"
  sort?: MarketSort
  query?: string
}

export interface CreateMarketInput {
  question: string
  description: string
  category: MarketCategory
  endTime: IsoDateString
  outcomes: string[]
  initialLiquidity: number
  resolutionSource: string
  creatorAddress: Address
  tags: string[]
}
