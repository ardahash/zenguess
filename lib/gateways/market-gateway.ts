import type {
  CreateMarketInput,
  ListMarketsFilters,
  MarketEntity,
  TradeEntity,
} from "@/services/markets/market.types"

export interface SimulateTradeInput {
  marketId: string
  outcomeIndex: number
  amount: number
  side: "buy" | "sell"
}

export interface SimulateTradeOutput {
  estimatedCost: number
  estimatedShares: number
  fee: number
  averagePrice: number
}

export interface SubmitTradeInput extends SimulateTradeInput {
  slippage: number
  traderAddress?: string
}

export interface SubmitTradeOutput {
  success: boolean
  txHash: `0x${string}`
  trade: TradeEntity
}

export interface ResolveMarketInput {
  marketId: string
  resolvedOutcome: number
}

export interface ClaimWinningsOutput {
  success: boolean
  amount: number
}

export interface MarketGateway {
  listMarkets(filters?: ListMarketsFilters): Promise<MarketEntity[]>
  getMarket(marketId: string): Promise<MarketEntity | null>
  simulateTrade(input: SimulateTradeInput): Promise<SimulateTradeOutput>
  submitTrade(input: SubmitTradeInput): Promise<SubmitTradeOutput>
  createMarket(input: CreateMarketInput): Promise<MarketEntity>
  resolveMarket(input: ResolveMarketInput): Promise<MarketEntity | null>
  claimWinnings(marketId: string, account: string): Promise<ClaimWinningsOutput>
}
