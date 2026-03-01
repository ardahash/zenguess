import {
  seedActivity,
  seedMarkets,
  seedPositionsByAddress,
  seedTrades,
} from "./market.seed"
import { withDerivedStatus } from "./market.status"
import type {
  ActivityEventEntity,
  CreateMarketInput,
  ListMarketsFilters,
  MarketEntity,
  MarketSort,
  PortfolioPositionEntity,
  TradeEntity,
} from "./market.types"

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function randomUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return Math.random().toString(16).slice(2) + Date.now().toString(16)
}

function sortMarkets(markets: MarketEntity[], sort: MarketSort): MarketEntity[] {
  const sorted = [...markets]

  switch (sort) {
    case "newest":
      sorted.sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
      )
      break
    case "ending_soon":
      sorted.sort((a, b) => Date.parse(a.endTime) - Date.parse(b.endTime))
      break
    case "liquidity":
      sorted.sort((a, b) => b.liquidity - a.liquidity)
      break
    case "volume":
    default:
      sorted.sort((a, b) => b.volume - a.volume)
      break
  }

  return sorted
}

class InMemoryMarketRepository {
  private markets: MarketEntity[] = clone(seedMarkets)
  private trades: TradeEntity[] = clone(seedTrades)
  private activity: ActivityEventEntity[] = clone(seedActivity)
  private positionsByAddress: Record<string, PortfolioPositionEntity[]> =
    clone(seedPositionsByAddress)

  listMarkets(filters: ListMarketsFilters = {}): MarketEntity[] {
    const {
      category = "all",
      status = "all",
      query,
      sort = "volume",
    } = filters
    let markets = this.markets.map((market) => withDerivedStatus(market))

    if (category !== "all") {
      markets = markets.filter((market) => market.category === category)
    }

    if (status !== "all") {
      markets = markets.filter((market) => market.status === status)
    }

    if (query) {
      const normalized = query.toLowerCase().trim()
      markets = markets.filter(
        (market) =>
          market.question.toLowerCase().includes(normalized) ||
          market.tags.some((tag) => tag.toLowerCase().includes(normalized))
      )
    }

    return clone(sortMarkets(markets, sort))
  }

  getMarket(marketId: string): MarketEntity | null {
    const market = this.markets.find((item) => item.id === marketId)
    if (!market) {
      return null
    }

    return clone(withDerivedStatus(market))
  }

  listTradesByMarket(marketId: string): TradeEntity[] {
    const trades = this.trades
      .filter((trade) => trade.marketId === marketId)
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))

    return clone(trades)
  }

  listActivity(limit: number = 100): ActivityEventEntity[] {
    const events = [...this.activity]
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, limit)

    return clone(events)
  }

  getPortfolio(address: string): PortfolioPositionEntity[] {
    const normalized = address.toLowerCase()
    const positions =
      this.positionsByAddress[normalized] ??
      this.positionsByAddress["0x1000000000000000000000000000000000000001"] ??
      []

    return clone(positions)
  }

  createMarket(input: CreateMarketInput): MarketEntity {
    const now = new Date().toISOString()
    const market: MarketEntity = {
      id: `market_${randomUuid().slice(0, 8)}`,
      question: input.question,
      description: input.description,
      category: input.category,
      status: "open",
      outcomes: input.outcomes.map((label) => ({
        label,
        probability: Number((1 / input.outcomes.length).toFixed(4)),
      })),
      endTime: input.endTime,
      createdAt: now,
      volume: 0,
      liquidity: input.initialLiquidity,
      resolutionSource: input.resolutionSource,
      tags: input.tags,
      creatorAddress: input.creatorAddress,
    }

    this.markets.push(market)
    this.activity.unshift({
      id: `event_${randomUuid().slice(0, 8)}`,
      type: "market_created",
      marketId: market.id,
      marketTitle: market.question,
      description: `New market created with $${market.liquidity.toLocaleString()} initial liquidity`,
      actor: market.creatorAddress,
      timestamp: now,
      txHash: `0x${randomUuid().replaceAll("-", "")}${randomUuid().replaceAll(
        "-",
        ""
      )}`.slice(0, 66) as `0x${string}`,
    })

    return clone(market)
  }

  recordTrade(trade: TradeEntity): TradeEntity {
    this.trades.unshift(trade)
    const market = this.markets.find((item) => item.id === trade.marketId)
    if (market) {
      market.volume += trade.total
    }

    this.activity.unshift({
      id: `event_${randomUuid().slice(0, 8)}`,
      type: "trade",
      marketId: trade.marketId,
      marketTitle: market?.question ?? trade.marketId,
      description: `${trade.side.toUpperCase()} ${trade.shares.toFixed(
        2
      )} ${trade.outcomeLabel} shares at $${trade.price.toFixed(2)}`,
      actor: trade.traderAddress,
      timestamp: trade.timestamp,
      txHash: trade.txHash,
      metadata: {
        outcomeIndex: trade.outcomeIndex,
        shares: trade.shares,
        total: trade.total,
      },
    })

    return clone(trade)
  }

  resolveMarket(marketId: string, resolvedOutcome: number): MarketEntity | null {
    const market = this.markets.find((item) => item.id === marketId)
    if (!market) {
      return null
    }

    market.status = "resolved"
    market.resolvedOutcome = resolvedOutcome

    return clone(market)
  }
}

export const marketRepository = new InMemoryMarketRepository()
