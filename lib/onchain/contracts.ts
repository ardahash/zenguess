import type { Abi, Address } from "viem"
import { clientEnv } from "@/lib/env/client"
import { defaultChain, horizenMainnet, horizenTestnet } from "@/lib/chains"

export interface MarketContractBundle {
  marketManager: Address
  collateralToken: Address
}

type CollateralMode = "usdce" | "eth"

const COLLATERAL_ADDRESSES = {
  weth: "0x4200000000000000000000000000000000000006",
  usdce: "0xDF7108f8B10F9b9eC1aba01CCa057268cbf86B6c",
} as const satisfies Record<string, Address>

export const CONTRACT_ADDRESSES: Record<
  "mainnet" | "testnet",
  Record<CollateralMode, MarketContractBundle>
> = {
  mainnet: {
    // Legacy ETH/WETH manager kept for internal testing.
    eth: {
      marketManager: "0xE3dB30ff10E851aA1f3e50Ed212281CB5e98a9E8",
      collateralToken: COLLATERAL_ADDRESSES.weth,
    },
    // Default production manager for USDC.e collateral.
    usdce: {
      marketManager: "0x770fc931e07A6Df2f5F0Aa481a7c6AeC45286Ea7",
      collateralToken: COLLATERAL_ADDRESSES.usdce,
    },
  },
  testnet: {
    // ETH-only manager remains available for testnet.
    eth: {
      marketManager: "0xba7147BCE0e12414e7612Ab72D386FeBAdB3322D",
      collateralToken: COLLATERAL_ADDRESSES.weth,
    },
    // Placeholder until a USDC.e testnet deployment is performed.
    usdce: {
      marketManager: "0xba7147BCE0e12414e7612Ab72D386FeBAdB3322D",
      collateralToken: COLLATERAL_ADDRESSES.weth,
    },
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
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
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

export const wethAbi = [
  ...erc20Abi,
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "wad", type: "uint256" }],
    outputs: [],
  },
] as const satisfies Abi

export function getContractBundle(chainId: number = defaultChain.id): MarketContractBundle {
  const collateralMode = clientEnv.NEXT_PUBLIC_COLLATERAL_MODE

  if (chainId === horizenTestnet.id) {
    return CONTRACT_ADDRESSES.testnet[collateralMode]
  }

  if (chainId === horizenMainnet.id) {
    return CONTRACT_ADDRESSES.mainnet[collateralMode]
  }

  const networkKey =
    clientEnv.NEXT_PUBLIC_DEFAULT_CHAIN === "testnet" ? "testnet" : "mainnet"
  return CONTRACT_ADDRESSES[networkKey][collateralMode]
}
