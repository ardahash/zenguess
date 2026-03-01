import { simulateTradeMath } from "@/lib/pricing"
import {
  marketRepository,
  type CreateMarketInput,
  type ListMarketsFilters,
  type MarketEntity,
  type TradeEntity,
} from "@/services/markets"
import type {
  ClaimWinningsOutput,
  MarketGateway,
  ResolveMarketInput,
  SimulateTradeInput,
  SimulateTradeOutput,
  SubmitTradeInput,
  SubmitTradeOutput,
} from "./market-gateway"

function randomUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return Math.random().toString(16).slice(2) + Date.now().toString(16)
}

function createMockTxHash(): `0x${string}` {
  const hash = `${randomUuid().replaceAll("-", "")}${randomUuid().replaceAll(
    "-",
    ""
  )}`
  return `0x${hash.slice(0, 64)}` as `0x${string}`
}

export class MockMarketGateway implements MarketGateway {
  async listMarkets(filters: ListMarketsFilters = {}): Promise<MarketEntity[]> {
    return marketRepository.listMarkets(filters)
  }

  async getMarket(marketId: string): Promise<MarketEntity | null> {
    return marketRepository.getMarket(marketId)
  }

  async simulateTrade(input: SimulateTradeInput): Promise<SimulateTradeOutput> {
    const market = await this.getMarket(input.marketId)
    if (!market) {
      throw new Error("Market not found")
    }

    const outcome = market.outcomes[input.outcomeIndex]
    const probability = outcome?.probability ?? 0.5
    return simulateTradeMath({
      amountUsd: input.amount,
      probability,
      side: input.side,
    })
  }

  async submitTrade(input: SubmitTradeInput): Promise<SubmitTradeOutput> {
    const market = await this.getMarket(input.marketId)
    if (!market) {
      throw new Error("Market not found")
    }

    const simulation = await this.simulateTrade(input)
    const txHash = createMockTxHash()
    const trade: TradeEntity = {
      id: `trade_${randomUuid().slice(0, 8)}`,
      marketId: input.marketId,
      traderAddress:
        input.traderAddress ?? "0x1000000000000000000000000000000000000001",
      outcomeIndex: input.outcomeIndex,
      outcomeLabel: market.outcomes[input.outcomeIndex]?.label ?? "Outcome",
      side: input.side,
      shares: Number(simulation.estimatedShares.toFixed(4)),
      price: Number(simulation.averagePrice.toFixed(4)),
      total: Number(simulation.estimatedCost.toFixed(4)),
      timestamp: new Date().toISOString(),
      txHash,
    }

    marketRepository.recordTrade(trade)
    return { success: true, txHash, trade }
  }

  async createMarket(input: CreateMarketInput): Promise<MarketEntity> {
    return marketRepository.createMarket(input)
  }

  async resolveMarket(input: ResolveMarketInput): Promise<MarketEntity | null> {
    return marketRepository.resolveMarket(
      input.marketId,
      input.resolvedOutcome
    )
  }

  async claimWinnings(
    marketId: string,
    account: string
  ): Promise<ClaimWinningsOutput> {
    void marketId
    void account
    return { success: true, amount: 150 }
  }
}
