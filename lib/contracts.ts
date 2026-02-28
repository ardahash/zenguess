// Placeholder contract addresses and ABIs
// TODO: Codex will plug in real ABIs and addresses here

export const CONTRACT_ADDRESSES = {
  // Main prediction market factory
  marketFactory: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  // Conditional token framework
  conditionalTokens:
    "0x0000000000000000000000000000000000000000" as `0x${string}`,
  // AMM / CPMM for trading
  ammFactory: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  // Collateral token (e.g., USDC or wrapped ZEN)
  collateralToken:
    "0x0000000000000000000000000000000000000000" as `0x${string}`,
} as const

// Placeholder ABI fragments - Codex will generate full ABIs
export const MARKET_FACTORY_ABI = [
  {
    name: "createMarket",
    type: "function",
    inputs: [
      { name: "question", type: "string" },
      { name: "endTime", type: "uint256" },
      { name: "outcomes", type: "string[]" },
      { name: "initialLiquidity", type: "uint256" },
    ],
    outputs: [{ name: "marketId", type: "bytes32" }],
  },
  {
    name: "resolveMarket",
    type: "function",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "outcome", type: "uint256" },
    ],
    outputs: [],
  },
] as const

export const CONDITIONAL_TOKENS_ABI = [
  {
    name: "buyShares",
    type: "function",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "outcomeIndex", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "maxCost", type: "uint256" },
    ],
    outputs: [{ name: "cost", type: "uint256" }],
  },
  {
    name: "sellShares",
    type: "function",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "outcomeIndex", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "minReturn", type: "uint256" },
    ],
    outputs: [{ name: "returnAmount", type: "uint256" }],
  },
  {
    name: "redeemPositions",
    type: "function",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [],
  },
] as const

// ---- Placeholder / Stub functions ----
// These simulate contract interactions. Replace with real wagmi hooks later.

export async function simulateTrade(params: {
  marketId: string
  outcomeIndex: number
  amount: number
  side: "buy" | "sell"
}): Promise<{ estimatedCost: number; estimatedShares: number; fee: number }> {
  // Stub: simple constant product pricing simulation
  const price = params.outcomeIndex === 0 ? 0.65 : 0.35
  const fee = params.amount * 0.02
  const estimatedShares =
    params.side === "buy"
      ? params.amount / price
      : params.amount * price
  const estimatedCost =
    params.side === "buy" ? params.amount + fee : params.amount - fee

  console.log("[ZenGuess] simulateTrade:", params, "->", {
    estimatedCost,
    estimatedShares,
    fee,
  })
  return { estimatedCost, estimatedShares, fee }
}

export async function submitTrade(params: {
  marketId: string
  outcomeIndex: number
  amount: number
  side: "buy" | "sell"
  slippage: number
}): Promise<{ success: boolean; txHash: string }> {
  // Stub: pretend we submitted a tx
  console.log("[ZenGuess] submitTrade:", params)
  await new Promise((r) => setTimeout(r, 1500))
  const fakeTxHash = `0x${Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("")}`
  return { success: true, txHash: fakeTxHash }
}

export async function createMarket(params: {
  question: string
  category: string
  endTime: number
  outcomes: string[]
  initialLiquidity: number
}): Promise<{ success: boolean; marketId: string }> {
  // Stub: pretend we created a market on-chain
  console.log("[ZenGuess] createMarket:", params)
  await new Promise((r) => setTimeout(r, 2000))
  const fakeMarketId = `market_${Date.now()}`
  return { success: true, marketId: fakeMarketId }
}

export async function claimWinnings(params: {
  marketId: string
}): Promise<{ success: boolean; amount: number }> {
  console.log("[ZenGuess] claimWinnings:", params)
  await new Promise((r) => setTimeout(r, 1000))
  return { success: true, amount: 150.0 }
}
