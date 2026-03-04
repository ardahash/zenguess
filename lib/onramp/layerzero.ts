import { parseUnits } from "viem"
import { serverEnv } from "@/lib/env/server"

const LAYERZERO_TRANSFER_API_BASE = "https://transfer.layerzero-api.com/v1"
const HORIZEN_CHAIN_ID = 26514

export type OnrampAsset = "ETH" | "USDC"

export interface OnrampChainOption {
  chainKey: string
  name: string
  chainId: number
}

interface LayerZeroChain {
  chainKey: string
  chainId: number
  name: string
  chainType: "EVM" | string
}

interface LayerZeroToken {
  isSupported?: boolean
  chainKey: string
  address: string
  symbol: string
  decimals: number
  iconUri?: string
}

interface LayerZeroEncodedTransaction {
  chainId: number
  from?: string
  to: string
  data: string
  value?: string
  gasLimit?: string
}

interface LayerZeroUserStepTransaction {
  type: "TRANSACTION"
  chainKey?: string
  chainType: "EVM" | string
  signerAddress?: string
  transaction: {
    encoded: LayerZeroEncodedTransaction
  }
}

type LayerZeroUserStep = LayerZeroUserStepTransaction | { type: string }

interface LayerZeroQuote {
  id: string
  srcAmount: string
  dstAmount: string
  dstAmountMin: string
  routeSteps?: Array<{ type?: string }>
  feeUsd?: string
  feePercent?: string
  userSteps: LayerZeroUserStep[]
}

interface LayerZeroQuotesResponse {
  quotes: LayerZeroQuote[]
  tokens?: LayerZeroToken[]
}

function getHeaders(): Record<string, string> {
  if (!serverEnv.LAYERZERO_API_KEY) {
    throw new Error(
      "Missing LAYERZERO_API_KEY. Set it in your environment to enable onramp quotes."
    )
  }

  return {
    "Content-Type": "application/json",
    "x-api-key": serverEnv.LAYERZERO_API_KEY,
  }
}

interface LayerZeroPagination {
  nextToken?: string
}

interface LayerZeroTokenListResponse {
  tokens: LayerZeroToken[]
  pagination?: LayerZeroPagination
}

let tokenCatalogCache:
  | {
      expiresAt: number
      tokens: LayerZeroToken[]
    }
  | undefined
const TOKEN_CATALOG_CACHE_TTL_MS = 60_000
const routeSupportCache = new Map<string, { expiresAt: number; supported: boolean }>()
const ROUTE_SUPPORT_CACHE_TTL_MS = 60_000

async function requestLayerZero<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${LAYERZERO_TRANSFER_API_BASE}${path}`, {
    ...init,
    headers: {
      ...getHeaders(),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })

  const payload = (await response.json()) as { message?: string; [key: string]: unknown }
  if (!response.ok) {
    const details =
      typeof payload.message === "string" ? payload.message : "LayerZero API request failed."
    throw new Error(details)
  }

  return payload as T
}

async function fetchLayerZeroTokens(
  baseQuery: Record<string, string> = {}
): Promise<LayerZeroToken[]> {
  const isUnfilteredRequest = Object.keys(baseQuery).length === 0
  if (isUnfilteredRequest && tokenCatalogCache && Date.now() < tokenCatalogCache.expiresAt) {
    return tokenCatalogCache.tokens
  }

  const tokens: LayerZeroToken[] = []
  let nextToken: string | undefined

  do {
    const query = new URLSearchParams(baseQuery)
    if (nextToken) {
      query.set("pagination[nextToken]", nextToken)
    }

    const payload = await requestLayerZero<LayerZeroTokenListResponse>(
      `/tokens?${query.toString()}`
    )
    tokens.push(...(payload.tokens ?? []))
    nextToken = payload.pagination?.nextToken
  } while (nextToken)

  if (isUnfilteredRequest) {
    tokenCatalogCache = {
      tokens,
      expiresAt: Date.now() + TOKEN_CATALOG_CACHE_TTL_MS,
    }
  }

  return tokens
}

async function chainHasAssetRouteToHorizen(
  chainKey: string,
  destinationChainKey: string,
  asset: OnrampAsset
): Promise<boolean> {
  const cacheKey = `${chainKey}:${destinationChainKey}:${asset}`
  const cached = routeSupportCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.supported
  }

  const sourceCandidates = (await fetchLayerZeroTokens())
    .filter(
      (token) =>
        token.chainKey === chainKey &&
        token.isSupported !== false &&
        isAssetMatch(asset, token.symbol)
    )
    .sort((a, b) => scoreToken(b, asset) - scoreToken(a, asset))

  for (const candidateSourceToken of sourceCandidates) {
    const destinations = await resolveDestinationCandidates({
      sourceChainKey: chainKey,
      sourceTokenAddress: candidateSourceToken.address,
    })
    if (
      destinations.some(
        (token) =>
          token.chainKey === destinationChainKey &&
          token.isSupported !== false &&
          isAssetMatch(asset, token.symbol)
      )
    ) {
      routeSupportCache.set(cacheKey, {
        supported: true,
        expiresAt: Date.now() + ROUTE_SUPPORT_CACHE_TTL_MS,
      })
      return true
    }
  }

  routeSupportCache.set(cacheKey, {
    supported: false,
    expiresAt: Date.now() + ROUTE_SUPPORT_CACHE_TTL_MS,
  })
  return false
}

export async function fetchSupportedOnrampChains(
  asset?: OnrampAsset
): Promise<OnrampChainOption[]> {
  const payload = await requestLayerZero<{ chains: LayerZeroChain[] }>("/chains")
  const allowedChainIds = new Set([1, 8453, 42161, 10])
  const allowedChains = payload.chains
    .filter((chain) => chain.chainType === "EVM" && allowedChainIds.has(chain.chainId))
    .sort((a, b) => a.name.localeCompare(b.name))
  if (!asset) {
    return allowedChains.map((chain) => ({
      chainKey: chain.chainKey,
      name: chain.name,
      chainId: chain.chainId,
    }))
  }

  const destinationChainKey = await resolveHorizenChainKey()
  const supportResults = await Promise.all(
    allowedChains.map(async (chain) => ({
      chain,
      supported: await chainHasAssetRouteToHorizen(
        chain.chainKey,
        destinationChainKey,
        asset
      ),
    }))
  )

  return supportResults
    .filter((entry) => entry.supported)
    .map((entry) => ({
      chainKey: entry.chain.chainKey,
      name: entry.chain.name,
      chainId: entry.chain.chainId,
    }))
}

function isAssetMatch(asset: OnrampAsset, symbol: string): boolean {
  const normalized = symbol.toUpperCase()
  if (asset === "ETH") {
    return normalized === "ETH" || normalized === "WETH"
  }

  return normalized.includes("USDC")
}

const NATIVE_ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"

function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

function isNativeEthToken(token: LayerZeroToken): boolean {
  return normalizeAddress(token.address) === NATIVE_ETH_ADDRESS
}

function pickBestToken(
  tokens: LayerZeroToken[],
  asset: OnrampAsset,
  options?: {
    preferWrappedEth?: boolean
    preferUsdcBridged?: boolean
  }
): LayerZeroToken | null {
  if (tokens.length === 0) {
    return null
  }

  const sorted = [...tokens].sort((a, b) => {
    const aScore = scoreToken(a, asset, options)
    const bScore = scoreToken(b, asset, options)
    return bScore - aScore
  })

  return sorted[0] ?? null
}

function scoreToken(
  token: LayerZeroToken,
  asset: OnrampAsset,
  options?: {
    preferWrappedEth?: boolean
    preferUsdcBridged?: boolean
  }
): number {
  const symbol = token.symbol.toUpperCase()

  if (asset === "ETH") {
    const prefersWrapped = options?.preferWrappedEth ?? false
    if (symbol === "ETH" && isNativeEthToken(token)) {
      return prefersWrapped ? 75 : 100
    }
    if (symbol === "WETH") {
      return prefersWrapped ? 100 : 70
    }
    if (symbol === "ETH") {
      return 60
    }
    return 0
  }

  const prefersBridged = options?.preferUsdcBridged ?? false
  if (symbol === "USDC.E") {
    return prefersBridged ? 100 : 90
  }
  if (symbol === "USDC") {
    return 95
  }
  if (symbol.includes("USDC")) {
    return 80
  }
  return 0
}

async function resolveHorizenChainKey(): Promise<string> {
  const payload = await requestLayerZero<{ chains: LayerZeroChain[] }>("/chains")
  const match = payload.chains.find((chain) => chain.chainId === HORIZEN_CHAIN_ID)
  if (!match) {
    throw new Error("Horizen chain is not available in LayerZero transfer API.")
  }
  return match.chainKey
}

async function resolveDestinationCandidates(args: {
  sourceChainKey: string
  sourceTokenAddress: string
}): Promise<LayerZeroToken[]> {
  const payload = await requestLayerZero<LayerZeroTokenListResponse>(
    `/tokens?transferrableFromChainKey=${encodeURIComponent(
      args.sourceChainKey
    )}&transferrableFromTokenAddress=${encodeURIComponent(args.sourceTokenAddress)}`
  )
  return payload.tokens ?? []
}

async function resolveSourceAndDestinationTokenPair(args: {
  sourceChainKey: string
  destinationChainKey: string
  asset: OnrampAsset
}): Promise<{
  sourceToken: LayerZeroToken
  destinationToken: LayerZeroToken
}> {
  const sourceCandidates = (await fetchLayerZeroTokens())
    .filter(
      (token) =>
        token.chainKey === args.sourceChainKey &&
        token.isSupported !== false &&
        isAssetMatch(args.asset, token.symbol)
    )
    .sort((a, b) => scoreToken(b, args.asset) - scoreToken(a, args.asset))

  for (const candidateSourceToken of sourceCandidates) {
    const destinationCandidates = await resolveDestinationCandidates({
      sourceChainKey: args.sourceChainKey,
      sourceTokenAddress: candidateSourceToken.address,
    })
    const matchingDestinations = destinationCandidates.filter(
      (token) =>
        token.chainKey === args.destinationChainKey &&
        token.isSupported !== false &&
        isAssetMatch(args.asset, token.symbol)
    )
    const destinationToken = pickBestToken(matchingDestinations, args.asset, {
      preferUsdcBridged: args.destinationChainKey === "horizen",
    })

    if (destinationToken) {
      return {
        sourceToken: candidateSourceToken,
        destinationToken,
      }
    }
  }

  throw new Error(
    `${args.asset} route to Horizen is unavailable from ${args.sourceChainKey} at the moment.`
  )
}

function formatAmountFromUnits(amount: string, decimals: number): number {
  const divisor = 10 ** decimals
  return Number(amount) / divisor
}

function findTokenInQuotePayload(
  payloadTokens: LayerZeroToken[] | undefined,
  chainKey: string,
  address: string
): LayerZeroToken | null {
  if (!payloadTokens || payloadTokens.length === 0) {
    return null
  }

  const normalizedAddress = normalizeAddress(address)
  const match = payloadTokens.find(
    (token) =>
      token.chainKey === chainKey &&
      normalizeAddress(token.address) === normalizedAddress
  )
  return match ?? null
}

export interface OnrampQuoteResult {
  requestId: string
  sourceChainKey: string
  destinationChainKey: string
  sourceToken: LayerZeroToken
  destinationToken: LayerZeroToken
  amountIn: number
  amountOut: number
  amountOutMin: number
  routeType: string
  feeUsd?: string
  feePercent?: string
  userSteps: LayerZeroUserStep[]
}

export async function fetchOnrampQuote(args: {
  sourceChainKey: string
  asset: OnrampAsset
  amount: number
  recipient: string
}): Promise<OnrampQuoteResult> {
  if (!Number.isFinite(args.amount) || args.amount <= 0) {
    throw new Error("Amount must be greater than 0.")
  }

  const destinationChainKey = await resolveHorizenChainKey()
  const { sourceToken, destinationToken } =
    await resolveSourceAndDestinationTokenPair({
      sourceChainKey: args.sourceChainKey,
      destinationChainKey,
      asset: args.asset,
    })

  const amountIn = parseUnits(args.amount.toString(), sourceToken.decimals).toString()
  const payload = await requestLayerZero<LayerZeroQuotesResponse>("/quotes", {
    method: "POST",
    body: JSON.stringify({
      srcChainKey: args.sourceChainKey,
      dstChainKey: destinationChainKey,
      srcTokenAddress: sourceToken.address,
      dstTokenAddress: destinationToken.address,
      srcWalletAddress: args.recipient,
      dstWalletAddress: args.recipient,
      amount: amountIn,
    }),
  })

  const quote = payload.quotes[0]
  if (!quote) {
    throw new Error("No bridge quote available for this route right now.")
  }

  const resolvedSourceToken =
    findTokenInQuotePayload(
      payload.tokens,
      sourceToken.chainKey,
      sourceToken.address
    ) ?? sourceToken
  const resolvedDestinationToken =
    findTokenInQuotePayload(
      payload.tokens,
      destinationToken.chainKey,
      destinationToken.address
    ) ?? destinationToken

  return {
    requestId: quote.id,
    sourceChainKey: args.sourceChainKey,
    destinationChainKey,
    sourceToken: resolvedSourceToken,
    destinationToken: resolvedDestinationToken,
    amountIn: formatAmountFromUnits(quote.srcAmount, resolvedSourceToken.decimals),
    amountOut: formatAmountFromUnits(
      quote.dstAmount,
      resolvedDestinationToken.decimals
    ),
    amountOutMin: formatAmountFromUnits(
      quote.dstAmountMin,
      resolvedDestinationToken.decimals
    ),
    routeType: quote.routeSteps?.[0]?.type ?? "value-transfer",
    feeUsd: quote.feeUsd,
    feePercent: quote.feePercent,
    userSteps: quote.userSteps ?? [],
  }
}
