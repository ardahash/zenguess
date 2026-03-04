import type { PublicClient, WalletClient } from "viem"
import { clientEnv } from "@/lib/env/client"
import type {
  CreateMarketInput,
  ListMarketsFilters,
  MarketEntity,
} from "@/services/markets"
import type {
  ClaimWinningsOutput,
  SimulateTradeOutput,
  SubmitTradeOutput,
} from "@/lib/gateways/market-gateway"
import {
  CONTRACT_ADDRESSES,
  type MarketContractBundle,
  erc20Abi,
  zenGuessMarketManagerAbi,
} from "@/lib/onchain/contracts"
import {
  claimWinningsWithWallet,
  createMarketWithWallet,
  resolveMarketWithWallet,
  submitTradeWithWallet,
} from "@/lib/onchain/writes"

interface ApiEnvelope<T> {
  data: T
}

export { CONTRACT_ADDRESSES, erc20Abi, zenGuessMarketManagerAbi }
export type { MarketContractBundle }

export function isOnchainGatewayEnabled(): boolean {
  return clientEnv.NEXT_PUBLIC_GATEWAY_MODE === "onchain"
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = "Request failed."
    try {
      const payload = (await response.json()) as { error?: string }
      if (payload.error) {
        errorMessage = payload.error
      }
    } catch {
      // Ignore response parse failures and keep fallback message.
    }
    throw new Error(errorMessage)
  }

  const payload = (await response.json()) as ApiEnvelope<T>
  return payload.data
}

export async function listMarkets(
  filters: ListMarketsFilters = {}
): Promise<MarketEntity[]> {
  const params = new URLSearchParams()
  if (filters.category && filters.category !== "all") {
    params.set("category", filters.category)
  }
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status)
  }
  if (filters.sort) {
    params.set("sort", filters.sort)
  }
  if (filters.query?.trim()) {
    params.set("q", filters.query.trim())
  }

  const query = params.toString()
  const response = await fetch(`/api/markets${query ? `?${query}` : ""}`, {
    cache: "no-store",
  })

  return parseApiResponse<MarketEntity[]>(response)
}

export async function getMarket(marketId: string): Promise<MarketEntity | null> {
  const response = await fetch(`/api/markets/${marketId}`, {
    cache: "no-store",
  })

  if (response.status === 404) {
    return null
  }

  return parseApiResponse<MarketEntity>(response)
}

export async function simulateTrade(params: {
  marketId: string
  outcomeIndex: number
  amount: number
  side: "buy" | "sell"
}): Promise<SimulateTradeOutput> {
  const response = await fetch("/api/trades/simulate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  })

  return parseApiResponse<SimulateTradeOutput>(response)
}

export async function submitTrade(params: {
  marketId: string
  outcomeIndex: number
  amount: number
  side: "buy" | "sell"
  slippage: number
  traderAddress?: string
}): Promise<SubmitTradeOutput> {
  const response = await fetch("/api/trades", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  })

  return parseApiResponse<SubmitTradeOutput>(response)
}

export async function createMarket(input: CreateMarketInput): Promise<MarketEntity> {
  const response = await fetch("/api/markets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  return parseApiResponse<MarketEntity>(response)
}

export async function resolveMarket(input: {
  marketId: string
  resolvedOutcome: number
}) {
  void input
  throw new Error("Market resolution endpoint is not implemented yet.")
}

export async function claimWinnings(input: {
  marketId: string
  account: string
}): Promise<ClaimWinningsOutput> {
  void input
  return Promise.resolve({ success: false, amount: 0 })
}

interface WalletExecutionContext {
  publicClient: PublicClient
  walletClient: WalletClient
}

export async function createMarketOnchain(
  context: WalletExecutionContext,
  input: CreateMarketInput
) {
  return createMarketWithWallet(context, input)
}

export async function submitTradeOnchain(
  context: WalletExecutionContext,
  params: {
    marketId: string
    outcomeIndex: number
    amount: number
    side: "buy" | "sell"
    slippage: number
    traderAddress?: string
  }
) {
  return submitTradeWithWallet(context, params)
}

export async function claimWinningsOnchain(
  context: WalletExecutionContext,
  input: {
    marketId: string
  }
) {
  return claimWinningsWithWallet(context, input.marketId)
}

export async function resolveMarketOnchain(
  context: WalletExecutionContext,
  input: {
    marketId: string
    resolvedOutcome: number
  }
) {
  return resolveMarketWithWallet(context, input)
}
