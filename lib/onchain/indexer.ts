import type { Address } from "viem"
import {
  type ActivityEventEntity,
  type ListMarketsFilters,
  type MarketEntity,
  type MarketSort,
  type PortfolioPositionEntity,
  type TradeEntity,
} from "@/services/markets/market.types"
import { clientEnv } from "@/lib/env/client"
import { getOnchainPublicClient } from "@/lib/onchain/client"
import {
  getContractBundle,
  zenGuessMarketManagerAbi,
  erc20Abi,
} from "@/lib/onchain/contracts"
import {
  SHARE_DECIMALS,
  formatTokenAmount,
  parseTokenAmount,
  parseMarketId,
} from "@/lib/onchain/utils"

interface MarketView {
  marketId: bigint
  question: string
  resolutionSource: string
  creator: Address
  createdAt: bigint
  endTime: bigint
  resolvedAt: bigint
  outcomeCount: number
  winningOutcome: number
  resolved: boolean
  totalCollateral: bigint
  totalClaimed: bigint
}

interface TradeQuote {
  estimatedAmount: bigint
  fee: bigint
  executionPrice: bigint
}

interface TradeVolumeStats {
  byMarket: Map<string, number>
  tradeLogs: Awaited<ReturnType<typeof fetchTradeLogs>>
}

interface CacheEntry<T> {
  expiresAt: number
  value: T
}

type CacheStore = {
  marketSnapshot?: CacheEntry<MarketEntity[]>
  tradeVolumeStats?: CacheEntry<TradeVolumeStats>
}

const CACHE_TTL_MS = 8_000
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

function getCacheStore(): CacheStore {
  const globalStore = globalThis as typeof globalThis & {
    __zenguessOnchainCache?: CacheStore
  }

  if (!globalStore.__zenguessOnchainCache) {
    globalStore.__zenguessOnchainCache = {}
  }

  return globalStore.__zenguessOnchainCache
}

function getCachedValue<T>(entry?: CacheEntry<T>): T | null {
  if (!entry) {
    return null
  }
  if (Date.now() > entry.expiresAt) {
    return null
  }
  return entry.value
}

function setMarketSnapshotCache(value: MarketEntity[]): MarketEntity[] {
  const store = getCacheStore()
  store.marketSnapshot = {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  }
  return value
}

function setTradeVolumeStatsCache(value: TradeVolumeStats): TradeVolumeStats {
  const store = getCacheStore()
  store.tradeVolumeStats = {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  }
  return value
}

function toIsoTimestamp(seconds: bigint): string {
  return new Date(Number(seconds) * 1000).toISOString()
}

function normalizeStatus(
  resolved: boolean,
  endTimeSeconds: bigint
): MarketEntity["status"] {
  if (resolved) {
    return "resolved"
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  return Number(endTimeSeconds) <= nowSeconds ? "closed" : "open"
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

function filterAndSortMarkets(
  markets: MarketEntity[],
  filters: ListMarketsFilters = {}
): MarketEntity[] {
  const {
    category = "all",
    status = "all",
    query,
    sort = "volume",
  } = filters

  let filtered = [...markets]

  if (category !== "all") {
    filtered = filtered.filter((market) => market.category === category)
  }

  if (status !== "all") {
    filtered = filtered.filter((market) => market.status === status)
  }

  if (query?.trim()) {
    const normalized = query.trim().toLowerCase()
    filtered = filtered.filter(
      (market) =>
        market.question.toLowerCase().includes(normalized) ||
        market.tags.some((tag) => tag.toLowerCase().includes(normalized))
    )
  }

  return sortMarkets(filtered, sort)
}

async function getCollateralDecimals(): Promise<number> {
  const client = getOnchainPublicClient()
  const contracts = getContractBundle()
  const decimals = (await client.readContract({
    address: contracts.collateralToken,
    abi: erc20Abi,
    functionName: "decimals",
  })) as number

  return Number(decimals)
}

function getFromBlock(): bigint {
  const raw = clientEnv.NEXT_PUBLIC_MARKET_MANAGER_DEPLOY_BLOCK?.trim()
  if (raw && /^\d+$/.test(raw)) {
    return BigInt(raw)
  }
  return 0n
}

async function fetchTradeLogs(args?: { marketId?: bigint; trader?: Address }) {
  const client = getOnchainPublicClient()
  const contracts = getContractBundle()

  return client.getContractEvents({
    address: contracts.marketManager,
    abi: zenGuessMarketManagerAbi,
    eventName: "TradeExecuted",
    fromBlock: getFromBlock(),
    toBlock: "latest",
    args: {
      marketId: args?.marketId,
      trader: args?.trader,
    },
  })
}

async function fetchMarketCreatedLogs() {
  const client = getOnchainPublicClient()
  const contracts = getContractBundle()
  return client.getContractEvents({
    address: contracts.marketManager,
    abi: zenGuessMarketManagerAbi,
    eventName: "MarketCreated",
    fromBlock: getFromBlock(),
    toBlock: "latest",
  })
}

async function fetchMarketResolvedLogs() {
  const client = getOnchainPublicClient()
  const contracts = getContractBundle()
  return client.getContractEvents({
    address: contracts.marketManager,
    abi: zenGuessMarketManagerAbi,
    eventName: "MarketResolved",
    fromBlock: getFromBlock(),
    toBlock: "latest",
  })
}

async function getTradeVolumeStats(): Promise<TradeVolumeStats> {
  const cached = getCachedValue(getCacheStore().tradeVolumeStats)
  if (cached) {
    return cached
  }

  const collateralDecimals = await getCollateralDecimals()
  const tradeLogs = await fetchTradeLogs()
  const byMarket = new Map<string, number>()

  for (const log of tradeLogs) {
    const marketId = log.args.marketId?.toString()
    if (!marketId) {
      continue
    }

    const side = Number(log.args.side ?? 0n)
    const inputAmount = log.args.inputAmount ?? 0n
    const outputAmount = log.args.outputAmount ?? 0n
    const fee = log.args.fee ?? 0n
    const collateralAmount = side === 0 ? inputAmount : outputAmount + fee

    byMarket.set(
      marketId,
      (byMarket.get(marketId) ?? 0) +
        formatTokenAmount(collateralAmount, collateralDecimals)
    )
  }

  return setTradeVolumeStatsCache({
    byMarket,
    tradeLogs,
  })
}

async function readMarketView(marketId: bigint): Promise<MarketView> {
  const client = getOnchainPublicClient()
  const contracts = getContractBundle()

  return (await client.readContract({
    address: contracts.marketManager,
    abi: zenGuessMarketManagerAbi,
    functionName: "getMarket",
    args: [marketId],
  })) as MarketView
}

async function readMarketOutcomes(marketId: bigint): Promise<string[]> {
  const client = getOnchainPublicClient()
  const contracts = getContractBundle()
  return (await client.readContract({
    address: contracts.marketManager,
    abi: zenGuessMarketManagerAbi,
    functionName: "getMarketOutcomes",
    args: [marketId],
  })) as string[]
}

async function readOutcomeLiquidity(
  marketId: bigint,
  outcomeIndex: number
): Promise<bigint> {
  const client = getOnchainPublicClient()
  const contracts = getContractBundle()
  return (await client.readContract({
    address: contracts.marketManager,
    abi: zenGuessMarketManagerAbi,
    functionName: "getOutcomeLiquidity",
    args: [marketId, outcomeIndex],
  })) as bigint
}

async function toMarketEntity(
  marketView: MarketView,
  options?: {
    volume?: number
    collateralDecimals?: number
    outcomes?: string[]
  }
): Promise<MarketEntity> {
  const collateralDecimals = options?.collateralDecimals ?? (await getCollateralDecimals())
  const outcomes = options?.outcomes ?? (await readMarketOutcomes(marketView.marketId))

  const outcomeLiquidity = await Promise.all(
    outcomes.map((_, index) => readOutcomeLiquidity(marketView.marketId, index))
  )

  const totalCollateralRaw = marketView.totalCollateral
  const totalCollateral = formatTokenAmount(totalCollateralRaw, collateralDecimals)
  const status = normalizeStatus(marketView.resolved, marketView.endTime)
  const mappedOutcomes = outcomes.map((label, index) => {
    const liquidity = outcomeLiquidity[index] ?? 0n
    const liquidityNumber = formatTokenAmount(liquidity, collateralDecimals)
    const probability =
      totalCollateral > 0
        ? liquidityNumber / totalCollateral
        : 1 / Math.max(outcomes.length, 1)

    return {
      label,
      probability: Number.isFinite(probability)
        ? Math.max(0, Math.min(1, probability))
        : 0,
    }
  })

  return {
    id: marketView.marketId.toString(),
    question: marketView.question,
    description: "",
    category: "other",
    status,
    outcomes: mappedOutcomes,
    endTime: toIsoTimestamp(marketView.endTime),
    createdAt: toIsoTimestamp(marketView.createdAt),
    volume: options?.volume ?? 0,
    liquidity: totalCollateral,
    resolvedOutcome: marketView.resolved
      ? Number(marketView.winningOutcome)
      : undefined,
    resolutionSource: marketView.resolutionSource,
    tags: [],
    creatorAddress: marketView.creator,
  }
}

async function loadAllMarketsSnapshot(): Promise<MarketEntity[]> {
  const cached = getCachedValue(getCacheStore().marketSnapshot)
  if (cached) {
    return cached
  }

  const client = getOnchainPublicClient()
  const contracts = getContractBundle()
  const marketIds = (await client.readContract({
    address: contracts.marketManager,
    abi: zenGuessMarketManagerAbi,
    functionName: "getMarketIds",
  })) as bigint[]

  if (marketIds.length === 0) {
    return setMarketSnapshotCache([])
  }

  const [tradeStats, collateralDecimals] = await Promise.all([
    getTradeVolumeStats(),
    getCollateralDecimals(),
  ])

  const views = await Promise.all(marketIds.map((marketId) => readMarketView(marketId)))
  const outcomes = await Promise.all(
    marketIds.map((marketId) => readMarketOutcomes(marketId))
  )

  const mapped = await Promise.all(
    views.map((view, index) =>
      toMarketEntity(view, {
        volume: tradeStats.byMarket.get(view.marketId.toString()) ?? 0,
        collateralDecimals,
        outcomes: outcomes[index] ?? [],
      })
    )
  )

  return setMarketSnapshotCache(mapped)
}

async function getBlockTimestamps(
  blockNumbers: bigint[]
): Promise<Map<string, string>> {
  const uniqueBlockNumbers = [...new Set(blockNumbers.map((value) => value.toString()))]
    .map((value) => BigInt(value))
    .sort((a, b) => (a < b ? -1 : 1))

  const client = getOnchainPublicClient()
  const entries = await Promise.all(
    uniqueBlockNumbers.map(async (blockNumber) => {
      const block = await client.getBlock({ blockNumber })
      return [blockNumber.toString(), toIsoTimestamp(block.timestamp)] as const
    })
  )

  return new Map(entries)
}

function sortLogsDescending<
  TLog extends { blockNumber: bigint | null; logIndex: number | null }
>(logs: TLog[]): TLog[] {
  return [...logs].sort((a, b) => {
    const aBlock = a.blockNumber ?? 0n
    const bBlock = b.blockNumber ?? 0n
    if (aBlock !== bBlock) {
      return aBlock > bBlock ? -1 : 1
    }

    const aIndex = a.logIndex ?? 0
    const bIndex = b.logIndex ?? 0
    return bIndex - aIndex
  })
}

export async function fetchOnchainMarkets(
  filters: ListMarketsFilters = {}
): Promise<MarketEntity[]> {
  const markets = await loadAllMarketsSnapshot()
  return filterAndSortMarkets(markets, filters)
}

export async function fetchOnchainMarketById(
  marketId: string
): Promise<MarketEntity | null> {
  try {
    const onchainMarketId = parseMarketId(marketId)
    const [view, outcomes, tradeStats, collateralDecimals] = await Promise.all([
      readMarketView(onchainMarketId),
      readMarketOutcomes(onchainMarketId),
      getTradeVolumeStats(),
      getCollateralDecimals(),
    ])

    return toMarketEntity(view, {
      outcomes,
      collateralDecimals,
      volume: tradeStats.byMarket.get(onchainMarketId.toString()) ?? 0,
    })
  } catch {
    return null
  }
}

export async function fetchOnchainTradeSimulation(input: {
  marketId: string
  outcomeIndex: number
  amount: number
  side: "buy" | "sell"
}): Promise<{
  estimatedCost: number
  estimatedShares: number
  fee: number
  averagePrice: number
}> {
  const client = getOnchainPublicClient()
  const contracts = getContractBundle()
  const collateralDecimals = await getCollateralDecimals()
  const market = await fetchOnchainMarketById(input.marketId)
  if (!market) {
    throw new Error("Market not found.")
  }

  const amountDecimals = input.side === "buy" ? collateralDecimals : SHARE_DECIMALS
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Trade amount must be greater than 0.")
  }

  const amountRaw = parseTokenAmount(
    input.amount,
    amountDecimals,
    input.side === "buy" ? "Trade amount" : "Shares amount"
  )
  if (amountRaw <= 0n) {
    throw new Error("Trade amount is too small.")
  }

  const quote = (await client.readContract({
    address: contracts.marketManager,
    abi: zenGuessMarketManagerAbi,
    functionName: "simulateTrade",
    args: [parseMarketId(input.marketId), input.outcomeIndex, amountRaw, input.side === "buy" ? 0 : 1],
  })) as TradeQuote

  const estimatedCost =
    input.side === "buy"
      ? formatTokenAmount(amountRaw, collateralDecimals)
      : formatTokenAmount(quote.estimatedAmount, collateralDecimals)

  const estimatedShares =
    input.side === "buy"
      ? formatTokenAmount(quote.estimatedAmount, SHARE_DECIMALS)
      : formatTokenAmount(amountRaw, SHARE_DECIMALS)

  return {
    estimatedCost,
    estimatedShares,
    fee: formatTokenAmount(quote.fee, collateralDecimals),
    averagePrice: Number(quote.executionPrice) / 1e18,
  }
}

export async function fetchOnchainTradesByMarket(
  marketId: string
): Promise<TradeEntity[]> {
  const onchainMarketId = parseMarketId(marketId)
  const collateralDecimals = await getCollateralDecimals()
  const outcomes = await readMarketOutcomes(onchainMarketId)
  const logs = sortLogsDescending(await fetchTradeLogs({ marketId: onchainMarketId }))
  if (logs.length === 0) {
    return []
  }

  const blockTimestamps = await getBlockTimestamps(
    logs.map((log) => log.blockNumber ?? 0n)
  )

  return logs.map((log) => {
    const side = Number(log.args.side ?? 0n) === 0 ? "buy" : "sell"
    const inputAmount = log.args.inputAmount ?? 0n
    const outputAmount = log.args.outputAmount ?? 0n
    const shares =
      side === "buy"
        ? formatTokenAmount(outputAmount, SHARE_DECIMALS)
        : formatTokenAmount(inputAmount, SHARE_DECIMALS)
    const total =
      side === "buy"
        ? formatTokenAmount(inputAmount, collateralDecimals)
        : formatTokenAmount(outputAmount, collateralDecimals)

    const price = shares > 0 ? total / shares : 0
    const outcomeIndex = Number(log.args.outcomeIndex ?? 0n)
    const txHash = log.transactionHash ?? ("0x0" as `0x${string}`)
    const blockNumberKey = (log.blockNumber ?? 0n).toString()

    return {
      id: `${txHash}-${log.logIndex ?? 0}`,
      marketId: onchainMarketId.toString(),
      traderAddress: (log.args.trader ?? ZERO_ADDRESS) as Address,
      outcomeIndex,
      outcomeLabel: outcomes[outcomeIndex] ?? `Outcome ${outcomeIndex + 1}`,
      side,
      shares,
      price,
      total,
      timestamp:
        blockTimestamps.get(blockNumberKey) ?? new Date().toISOString(),
      txHash,
    }
  })
}

export async function fetchOnchainActivity(
  limit: number = 100
): Promise<ActivityEventEntity[]> {
  const [markets, trades, createdLogs, resolvedLogs] = await Promise.all([
    loadAllMarketsSnapshot(),
    fetchTradeLogs(),
    fetchMarketCreatedLogs(),
    fetchMarketResolvedLogs(),
  ])
  const marketById = new Map(markets.map((market) => [market.id, market]))

  const allLogs = sortLogsDescending([
    ...trades,
    ...createdLogs,
    ...resolvedLogs,
  ])
  const logs = allLogs.slice(0, Math.max(limit * 2, limit))
  const blockTimestamps = await getBlockTimestamps(
    logs.map((log) => log.blockNumber ?? 0n)
  )
  const collateralDecimals = await getCollateralDecimals()
  const client = getOnchainPublicClient()

  const activity: ActivityEventEntity[] = []
  for (const log of logs) {
    if (activity.length >= limit) {
      break
    }

    const txHash = log.transactionHash ?? ("0x0" as `0x${string}`)
    const blockNumberKey = (log.blockNumber ?? 0n).toString()
    const timestamp =
      blockTimestamps.get(blockNumberKey) ?? new Date().toISOString()

    if (log.eventName === "TradeExecuted") {
      const marketId = log.args.marketId?.toString() ?? "0"
      const market = marketById.get(marketId)
      const side = Number(log.args.side ?? 0n) === 0 ? "buy" : "sell"
      const inputAmount = log.args.inputAmount ?? 0n
      const outputAmount = log.args.outputAmount ?? 0n
      const shares =
        side === "buy"
          ? formatTokenAmount(outputAmount, SHARE_DECIMALS)
          : formatTokenAmount(inputAmount, SHARE_DECIMALS)
      const total =
        side === "buy"
          ? formatTokenAmount(inputAmount, collateralDecimals)
          : formatTokenAmount(outputAmount, collateralDecimals)

      activity.push({
        id: `${txHash}-${log.logIndex ?? 0}`,
        type: "trade",
        marketId,
        marketTitle: market?.question ?? `Market ${marketId}`,
        description: `${side.toUpperCase()} ${shares.toFixed(2)} shares for $${total.toFixed(2)}`,
        actor: (log.args.trader ?? ZERO_ADDRESS) as Address,
        timestamp,
        txHash,
        metadata: {
          outcomeIndex: Number(log.args.outcomeIndex ?? 0n),
          side,
        },
      })
      continue
    }

    if (log.eventName === "MarketCreated") {
      const marketId = log.args.marketId?.toString() ?? "0"
      const market = marketById.get(marketId)
      const initialLiquidity = formatTokenAmount(
        log.args.initialLiquidity ?? 0n,
        collateralDecimals
      )
      activity.push({
        id: `${txHash}-${log.logIndex ?? 0}`,
        type: "market_created",
        marketId,
        marketTitle: market?.question ?? `Market ${marketId}`,
        description: `Market opened with $${initialLiquidity.toFixed(
          2
        )} initial liquidity`,
        actor: (log.args.creator ?? ZERO_ADDRESS) as Address,
        timestamp,
        txHash,
      })
      continue
    }

    if (log.eventName === "MarketResolved") {
      const marketId = log.args.marketId?.toString() ?? "0"
      const market = marketById.get(marketId)
      const tx =
        log.transactionHash && log.transactionHash !== "0x0"
          ? await client.getTransaction({ hash: log.transactionHash })
          : null
      const winningOutcome = Number(log.args.winningOutcome ?? 0n)
      activity.push({
        id: `${txHash}-${log.logIndex ?? 0}`,
        type: "market_resolved",
        marketId,
        marketTitle: market?.question ?? `Market ${marketId}`,
        description: `Resolved to outcome #${winningOutcome + 1}`,
        actor: (tx?.from ?? ZERO_ADDRESS) as Address,
        timestamp,
        txHash,
      })
    }
  }

  return activity.slice(0, limit)
}

export async function fetchOnchainPortfolio(
  address: string
): Promise<PortfolioPositionEntity[]> {
  const account = address as Address
  const markets = await loadAllMarketsSnapshot()
  const client = getOnchainPublicClient()
  const contracts = getContractBundle()

  const sharesByMarketOutcome = new Map<string, number>()
  for (const market of markets) {
    const marketId = parseMarketId(market.id)
    for (let outcomeIndex = 0; outcomeIndex < market.outcomes.length; outcomeIndex += 1) {
      const sharesRaw = (await client.readContract({
        address: contracts.marketManager,
        abi: zenGuessMarketManagerAbi,
        functionName: "getUserShares",
        args: [marketId, account, outcomeIndex],
      })) as bigint
      const shares = formatTokenAmount(sharesRaw, SHARE_DECIMALS)
      if (shares > 0) {
        sharesByMarketOutcome.set(`${market.id}:${outcomeIndex}`, shares)
      }
    }
  }

  if (sharesByMarketOutcome.size === 0) {
    return []
  }

  const tradeLogs = await fetchTradeLogs({ trader: account })
  const costBasisByMarketOutcome = new Map<
    string,
    { totalCost: number; totalShares: number }
  >()

  const sortedTrades = [...tradeLogs].sort((a, b) => {
    const aBlock = a.blockNumber ?? 0n
    const bBlock = b.blockNumber ?? 0n
    if (aBlock !== bBlock) {
      return aBlock < bBlock ? -1 : 1
    }
    return (a.logIndex ?? 0) - (b.logIndex ?? 0)
  })

  const collateralDecimals = await getCollateralDecimals()
  for (const log of sortedTrades) {
    const marketId = log.args.marketId?.toString()
    if (!marketId) {
      continue
    }
    const outcomeIndex = Number(log.args.outcomeIndex ?? 0n)
    const key = `${marketId}:${outcomeIndex}`

    const previous = costBasisByMarketOutcome.get(key) ?? {
      totalCost: 0,
      totalShares: 0,
    }
    const side = Number(log.args.side ?? 0n)
    const inputAmount = log.args.inputAmount ?? 0n
    const outputAmount = log.args.outputAmount ?? 0n

    if (side === 0) {
      previous.totalCost += formatTokenAmount(inputAmount, collateralDecimals)
      previous.totalShares += formatTokenAmount(outputAmount, SHARE_DECIMALS)
    } else {
      const sharesSold = formatTokenAmount(inputAmount, SHARE_DECIMALS)
      if (previous.totalShares > 0 && sharesSold > 0) {
        const avgCost = previous.totalCost / previous.totalShares
        previous.totalCost = Math.max(
          0,
          previous.totalCost - avgCost * sharesSold
        )
        previous.totalShares = Math.max(
          0,
          previous.totalShares - sharesSold
        )
      }
    }

    costBasisByMarketOutcome.set(key, previous)
  }

  const positions: PortfolioPositionEntity[] = []
  for (const market of markets) {
    for (let outcomeIndex = 0; outcomeIndex < market.outcomes.length; outcomeIndex += 1) {
      const key = `${market.id}:${outcomeIndex}`
      const shares = sharesByMarketOutcome.get(key)
      if (!shares || shares <= 0) {
        continue
      }

      const marketStatus = market.status
      const outcome = market.outcomes[outcomeIndex]
      const currentPrice =
        marketStatus === "resolved"
          ? market.resolvedOutcome === outcomeIndex
            ? 1
            : 0
          : outcome?.probability ?? 0

      const costBasis = costBasisByMarketOutcome.get(key)
      const avgPrice =
        costBasis && costBasis.totalShares > 0
          ? costBasis.totalCost / costBasis.totalShares
          : currentPrice

      positions.push({
        marketId: market.id,
        marketTitle: market.question,
        outcome: outcome?.label ?? `Outcome ${outcomeIndex + 1}`,
        shares,
        avgPrice,
        currentPrice,
        pnl: (currentPrice - avgPrice) * shares,
        status: marketStatus === "resolved" ? "resolved" : "open",
      })
    }
  }

  return positions
}
