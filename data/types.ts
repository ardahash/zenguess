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
  probability: number // 0-1
}

export interface Market {
  id: string
  question: string
  description: string
  category: MarketCategory
  status: MarketStatus
  outcomes: MarketOutcome[]
  endTime: Date
  createdAt: Date
  volume: number // USD
  liquidity: number // USD
  resolvedOutcome?: number // index of the winning outcome
  resolutionSource: string
  tags: string[]
  creatorAddress: string
}

export interface Trade {
  id: string
  marketId: string
  traderAddress: string
  outcomeIndex: number
  outcomeLabel: string
  side: "buy" | "sell"
  shares: number
  price: number
  total: number
  timestamp: Date
  txHash: string
}

export type ActivityEventType =
  | "trade"
  | "market_created"
  | "market_resolved"
  | "liquidity_added"

export interface ActivityEvent {
  id: string
  type: ActivityEventType
  marketId: string
  marketTitle: string
  description: string
  actor: string
  timestamp: Date
  txHash: string
  metadata?: Record<string, unknown>
}

export interface UserPosition {
  marketId: string
  marketTitle: string
  outcome: string
  shares: number
  avgPrice: number
  currentPrice: number
  pnl: number
  status: "open" | "resolved"
}
