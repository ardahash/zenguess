import type { Abi, Address } from "viem"
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

export interface MarketContractBundle {
  marketFactory: Address
  conditionalTokens: Address
  ammFactory: Address
  collateralToken: Address
}

export const CONTRACT_ADDRESSES: Record<
  "mainnet" | "testnet",
  MarketContractBundle
> = {
  mainnet: {
    // Deployed on 2026-03-01 to Horizen mainnet as ZenGuessMarketManager.
    marketFactory: "0x8AbEdc4f49EeffC225948784E474d2280bF55E94",
    conditionalTokens: "0x0000000000000000000000000000000000000000",
    ammFactory: "0x0000000000000000000000000000000000000000",
    collateralToken: "0xDF7108f8B10F9b9eC1aba01CCa057268cbf86B6c",
  },
  testnet: {
    // Deployed on 2026-03-01 to Horizen testnet as ZenGuessMarketManager.
    marketFactory: "0xFe89369Fc2A2013D65dfe4C6Cf953b15e5175B59",
    conditionalTokens: "0x0000000000000000000000000000000000000000",
    ammFactory: "0x0000000000000000000000000000000000000000",
    collateralToken: "0x6B518E35d352EDbdB68839445839f5a254eDBa71",
  },
}

// TODO: Paste final ABI fragments generated from deployed contracts.
export const MARKET_FACTORY_ABI: Abi = [
  {
    type: "function",
    name: "createMarket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "question", type: "string" },
      { name: "endTime", type: "uint256" },
      { name: "outcomes", type: "string[]" },
      { name: "initialLiquidity", type: "uint256" },
    ],
    outputs: [{ name: "marketId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "resolveMarket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "outcome", type: "uint256" },
    ],
    outputs: [],
  },
]

// TODO: Paste final conditional token ABI fragments.
export const CONDITIONAL_TOKENS_ABI: Abi = [
  {
    type: "function",
    name: "buyShares",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "outcomeIndex", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "maxCost", type: "uint256" },
    ],
    outputs: [{ name: "cost", type: "uint256" }],
  },
  {
    type: "function",
    name: "sellShares",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "outcomeIndex", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "minReturn", type: "uint256" },
    ],
    outputs: [{ name: "returnAmount", type: "uint256" }],
  },
  {
    type: "function",
    name: "redeemPositions",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [],
  },
]

interface ApiEnvelope<T> {
  data: T
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
      // Ignore parse failures and use the fallback error message.
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
}) {
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
}) {
  const response = await fetch("/api/trades", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  })

  return parseApiResponse<SubmitTradeOutput>(response)
}

export async function createMarket(input: CreateMarketInput) {
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
}) {
  void input
  return Promise.resolve<ClaimWinningsOutput>({ success: false, amount: 0 })
}
