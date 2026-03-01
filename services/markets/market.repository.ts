import fs from "node:fs"
import path from "node:path"
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

interface MockStore {
  markets: MarketEntity[]
  trades: TradeEntity[]
  activity: ActivityEventEntity[]
  positionsByAddress: Record<string, PortfolioPositionEntity[]>
}

type GlobalStore = typeof globalThis & {
  __zenguessMockStore?: MockStore
}

const enableDemoData = process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === "true"
const mockStorePath = path.join(process.cwd(), "cache", "market-store.json")
const isNodeRuntime = typeof process !== "undefined" && Boolean(process.versions?.node)
const shouldPersistStore = isNodeRuntime && !enableDemoData

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
      sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
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

function createInitialStore(): MockStore {
  return {
    markets: enableDemoData ? clone(seedMarkets) : [],
    trades: enableDemoData ? clone(seedTrades) : [],
    activity: enableDemoData ? clone(seedActivity) : [],
    positionsByAddress: enableDemoData ? clone(seedPositionsByAddress) : {},
  }
}

function isMockStore(value: unknown): value is MockStore {
  if (!value || typeof value !== "object") {
    return false
  }

  const typedValue = value as Partial<MockStore>
  return (
    Array.isArray(typedValue.markets) &&
    Array.isArray(typedValue.trades) &&
    Array.isArray(typedValue.activity) &&
    Boolean(typedValue.positionsByAddress) &&
    typeof typedValue.positionsByAddress === "object"
  )
}

function readStoreFromDisk(): MockStore | null {
  if (!shouldPersistStore) {
    return null
  }

  try {
    if (!fs.existsSync(mockStorePath)) {
      return null
    }

    const contents = fs.readFileSync(mockStorePath, "utf8")
    const parsed = JSON.parse(contents) as unknown
    if (!isMockStore(parsed)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeStoreToDisk(store: MockStore): void {
  if (!shouldPersistStore) {
    return
  }

  const storeDirectory = path.dirname(mockStorePath)
  const tempStorePath = `${mockStorePath}.${process.pid}.${Date.now()}.tmp`
  fs.mkdirSync(storeDirectory, { recursive: true })
  fs.writeFileSync(tempStorePath, JSON.stringify(store), "utf8")
  try {
    fs.renameSync(tempStorePath, mockStorePath)
  } catch {
    if (fs.existsSync(mockStorePath)) {
      fs.unlinkSync(mockStorePath)
    }
    fs.renameSync(tempStorePath, mockStorePath)
  }
}

class InMemoryMarketRepository {
  private readonly globalStore: GlobalStore
  private store: MockStore

  constructor() {
    this.globalStore = globalThis as GlobalStore
    const persistedStore = readStoreFromDisk()

    if (!this.globalStore.__zenguessMockStore) {
      const initialStore = persistedStore ?? createInitialStore()
      this.globalStore.__zenguessMockStore = initialStore
      if (!persistedStore) {
        writeStoreToDisk(initialStore)
      }
    } else if (persistedStore) {
      this.globalStore.__zenguessMockStore = persistedStore
    }

    this.store = this.globalStore.__zenguessMockStore
  }

  private syncFromDisk(): void {
    const persistedStore = readStoreFromDisk()
    if (!persistedStore) {
      return
    }

    this.globalStore.__zenguessMockStore = persistedStore
    this.store = persistedStore
  }

  private persistStore(): void {
    this.globalStore.__zenguessMockStore = this.store
    writeStoreToDisk(this.store)
  }

  listMarkets(filters: ListMarketsFilters = {}): MarketEntity[] {
    this.syncFromDisk()
    const { category = "all", status = "all", query, sort = "volume" } = filters
    let markets = this.store.markets.map((market) => withDerivedStatus(market))

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
    this.syncFromDisk()
    const market = this.store.markets.find((item) => item.id === marketId)
    if (!market) {
      return null
    }

    return clone(withDerivedStatus(market))
  }

  listTradesByMarket(marketId: string): TradeEntity[] {
    this.syncFromDisk()
    const trades = this.store.trades
      .filter((trade) => trade.marketId === marketId)
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))

    return clone(trades)
  }

  listActivity(limit: number = 100): ActivityEventEntity[] {
    this.syncFromDisk()
    const events = [...this.store.activity]
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, limit)

    return clone(events)
  }

  getPortfolio(address: string): PortfolioPositionEntity[] {
    this.syncFromDisk()
    const normalized = address.toLowerCase()
    const positions = this.store.positionsByAddress[normalized] ?? []

    return clone(positions)
  }

  createMarket(input: CreateMarketInput): MarketEntity {
    this.syncFromDisk()
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

    this.store.markets.push(market)
    this.store.activity.unshift({
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

    this.persistStore()
    return clone(market)
  }

  recordTrade(trade: TradeEntity): TradeEntity {
    this.syncFromDisk()
    this.store.trades.unshift(trade)
    const market = this.store.markets.find((item) => item.id === trade.marketId)
    if (market) {
      market.volume += trade.total
    }

    this.store.activity.unshift({
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

    this.persistStore()
    return clone(trade)
  }

  resolveMarket(marketId: string, resolvedOutcome: number): MarketEntity | null {
    this.syncFromDisk()
    const market = this.store.markets.find((item) => item.id === marketId)
    if (!market) {
      return null
    }

    market.status = "resolved"
    market.resolvedOutcome = resolvedOutcome

    this.persistStore()
    return clone(market)
  }
}

export const marketRepository = new InMemoryMarketRepository()
