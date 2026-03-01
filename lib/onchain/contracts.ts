import type { Abi, Address } from "viem"
import { clientEnv } from "@/lib/env/client"
import { defaultChain, horizenMainnet, horizenTestnet } from "@/lib/chains"

export interface MarketContractBundle {
  marketManager: Address
  collateralToken: Address
}

export const CONTRACT_ADDRESSES: Record<"mainnet" | "testnet", MarketContractBundle> =
  {
    mainnet: {
      marketManager: "0x8AbEdc4f49EeffC225948784E474d2280bF55E94",
      collateralToken: "0xDF7108f8B10F9b9eC1aba01CCa057268cbf86B6c",
    },
    testnet: {
      marketManager: "0xFe89369Fc2A2013D65dfe4C6Cf953b15e5175B59",
      collateralToken: "0x6B518E35d352EDbdB68839445839f5a254eDBa71",
    },
  }

export const zenGuessMarketManagerAbi = [
  {
    type: "function",
    name: "createMarket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "question", type: "string" },
      { name: "resolutionSource", type: "string" },
      { name: "endTime", type: "uint64" },
      { name: "outcomes", type: "string[]" },
      { name: "initialLiquidity", type: "uint256" },
    ],
    outputs: [{ name: "marketId", type: "uint256" }],
  },
  {
    type: "function",
    name: "buyShares",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcomeIndex", type: "uint8" },
      { name: "collateralIn", type: "uint256" },
      { name: "minSharesOut", type: "uint256" },
      { name: "deadline", type: "uint64" },
    ],
    outputs: [{ name: "sharesOut", type: "uint256" }],
  },
  {
    type: "function",
    name: "sellShares",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcomeIndex", type: "uint8" },
      { name: "sharesIn", type: "uint256" },
      { name: "minCollateralOut", type: "uint256" },
      { name: "deadline", type: "uint64" },
    ],
    outputs: [{ name: "collateralOut", type: "uint256" }],
  },
  {
    type: "function",
    name: "claimWinnings",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "payout", type: "uint256" }],
  },
  {
    type: "function",
    name: "resolveMarket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "winningOutcome", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "simulateTrade",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcomeIndex", type: "uint8" },
      { name: "amount", type: "uint256" },
      { name: "side", type: "uint8" },
    ],
    outputs: [
      {
        type: "tuple",
        name: "quote",
        components: [
          { name: "estimatedAmount", type: "uint256" },
          { name: "fee", type: "uint256" },
          { name: "executionPrice", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getMarketIds",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "ids", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getMarket",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        name: "",
        components: [
          { name: "marketId", type: "uint256" },
          { name: "question", type: "string" },
          { name: "resolutionSource", type: "string" },
          { name: "creator", type: "address" },
          { name: "createdAt", type: "uint64" },
          { name: "endTime", type: "uint64" },
          { name: "resolvedAt", type: "uint64" },
          { name: "outcomeCount", type: "uint8" },
          { name: "winningOutcome", type: "uint8" },
          { name: "resolved", type: "bool" },
          { name: "totalCollateral", type: "uint256" },
          { name: "totalClaimed", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getMarketOutcomes",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "outcomes", type: "string[]" }],
  },
  {
    type: "function",
    name: "getOutcomeLiquidity",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcomeIndex", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getOutcomeShares",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcomeIndex", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getUserShares",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "account", type: "address" },
      { name: "outcomeIndex", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "endTime", type: "uint64", indexed: false },
      { name: "outcomeCount", type: "uint8", indexed: false },
      { name: "initialLiquidity", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TradeExecuted",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "trader", type: "address", indexed: true },
      { name: "outcomeIndex", type: "uint8", indexed: true },
      { name: "side", type: "uint8", indexed: false },
      { name: "inputAmount", type: "uint256", indexed: false },
      { name: "outputAmount", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MarketResolved",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "winningOutcome", type: "uint8", indexed: true },
      { name: "resolvedAt", type: "uint64", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "WinningsClaimed",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "account", type: "address", indexed: true },
      { name: "payout", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const satisfies Abi

export const erc20Abi = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const satisfies Abi

export function getContractBundle(chainId: number = defaultChain.id): MarketContractBundle {
  if (chainId === horizenTestnet.id) {
    return CONTRACT_ADDRESSES.testnet
  }

  if (chainId === horizenMainnet.id) {
    return CONTRACT_ADDRESSES.mainnet
  }

  return clientEnv.NEXT_PUBLIC_DEFAULT_CHAIN === "testnet"
    ? CONTRACT_ADDRESSES.testnet
    : CONTRACT_ADDRESSES.mainnet
}
