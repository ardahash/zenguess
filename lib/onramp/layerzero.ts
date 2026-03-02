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
  chainKey: string
  address: string
  symbol: string
  decimals: number
  iconUri?: string
}

interface LayerZeroUserStepTransaction {
  type: "TRANSACTION"
  sender: string
  to: string
  data: string
  value?: string
  gasLimit?: string
  chainType: "EVM" | string
  chainId: number
}

type LayerZeroUserStep = LayerZeroUserStepTransaction | { type: string }

interface LayerZeroQuote {
  requestId: string
  amountIn: string
  amountOut: string
  amountOutMin: string
  srcToken: LayerZeroToken
  dstToken: LayerZeroToken
  routeType: string
  fee?: {
    usd?: string
    percent?: string
  }
  userSteps: LayerZeroUserStep[]
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

export async function fetchSupportedOnrampChains(): Promise<OnrampChainOption[]> {
  const payload = await requestLayerZero<{ chains: LayerZeroChain[] }>("/chains")
  const allowedChainIds = new Set([1, 8453, 42161, 10])
  return payload.chains
    .filter((chain) => chain.chainType === "EVM" && allowedChainIds.has(chain.chainId))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((chain) => ({
      chainKey: chain.chainKey,
      name: chain.name,
      chainId: chain.chainId,
    }))
}

function isAssetMatch(asset: OnrampAsset, symbol: string): boolean {
  const normalized = symbol.toUpperCase()
  if (asset === "ETH") {
    return normalized === "ETH" || normalized === "WETH"
  }

  return normalized.includes("USDC")
}

async function resolveHorizenChainKey(): Promise<string> {
  const payload = await requestLayerZero<{ chains: LayerZeroChain[] }>("/chains")
  const match = payload.chains.find((chain) => chain.chainId === HORIZEN_CHAIN_ID)
  if (!match) {
    throw new Error("Horizen chain is not available in LayerZero transfer API.")
  }
  return match.chainKey
}

async function resolveSourceToken(
  sourceChainKey: string,
  asset: OnrampAsset
): Promise<LayerZeroToken> {
  const payload = await requestLayerZero<{ tokens: LayerZeroToken[] }>(
    `/tokens?chainKey=${encodeURIComponent(sourceChainKey)}`
  )

  const match = payload.tokens.find((token) => isAssetMatch(asset, token.symbol))
  if (!match) {
    throw new Error(`${asset} is not supported on source chain ${sourceChainKey}.`)
  }

  return match
}

async function resolveDestinationToken(args: {
  sourceChainKey: string
  sourceTokenAddress: string
  destinationChainKey: string
  asset: OnrampAsset
}): Promise<LayerZeroToken> {
  const payload = await requestLayerZero<{ tokens: LayerZeroToken[] }>(
    `/tokens?transferrableFromChainKey=${encodeURIComponent(
      args.sourceChainKey
    )}&transferrableFromTokenAddress=${encodeURIComponent(args.sourceTokenAddress)}`
  )

  const candidate = payload.tokens.find(
    (token) =>
      token.chainKey === args.destinationChainKey &&
      isAssetMatch(args.asset, token.symbol)
  )
  if (!candidate) {
    throw new Error(
      `${args.asset} route to Horizen is unavailable from ${args.sourceChainKey} at the moment.`
    )
  }

  return candidate
}

function formatAmountFromUnits(amount: string, decimals: number): number {
  const divisor = 10 ** decimals
  return Number(amount) / divisor
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

  const [destinationChainKey, sourceToken] = await Promise.all([
    resolveHorizenChainKey(),
    resolveSourceToken(args.sourceChainKey, args.asset),
  ])
  const destinationToken = await resolveDestinationToken({
    sourceChainKey: args.sourceChainKey,
    sourceTokenAddress: sourceToken.address,
    destinationChainKey,
    asset: args.asset,
  })

  const amountIn = parseUnits(args.amount.toString(), sourceToken.decimals).toString()
  const payload = await requestLayerZero<{ quotes: LayerZeroQuote[] }>("/quotes", {
    method: "POST",
    body: JSON.stringify({
      srcEid: undefined,
      dstEid: undefined,
      srcChainKey: args.sourceChainKey,
      dstChainKey: destinationChainKey,
      srcTokenAddress: sourceToken.address,
      dstTokenAddress: destinationToken.address,
      amountIn,
      sender: args.recipient,
      recipient: args.recipient,
      destinationGas: "0",
    }),
  })

  const quote = payload.quotes[0]
  if (!quote) {
    throw new Error("No bridge quote available for this route right now.")
  }

  return {
    requestId: quote.requestId,
    sourceChainKey: args.sourceChainKey,
    destinationChainKey,
    sourceToken: quote.srcToken,
    destinationToken: quote.dstToken,
    amountIn: formatAmountFromUnits(quote.amountIn, quote.srcToken.decimals),
    amountOut: formatAmountFromUnits(quote.amountOut, quote.dstToken.decimals),
    amountOutMin: formatAmountFromUnits(
      quote.amountOutMin,
      quote.dstToken.decimals
    ),
    routeType: quote.routeType,
    feeUsd: quote.fee?.usd,
    feePercent: quote.fee?.percent,
    userSteps: quote.userSteps ?? [],
  }
}
