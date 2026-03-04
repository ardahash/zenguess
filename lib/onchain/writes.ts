import {
  formatUnits,
  maxUint256,
  type Address,
  type PublicClient,
  type WalletClient,
} from "viem"
import type {
  ClaimWinningsOutput,
  ResolveMarketInput,
  SubmitTradeInput,
  SubmitTradeOutput,
} from "@/lib/gateways/market-gateway"
import type { CreateMarketInput } from "@/services/markets"
import {
  erc20Abi,
  getContractBundle,
  wethAbi,
  zenGuessMarketManagerAbi,
} from "./contracts"
import {
  SHARE_DECIMALS,
  applySlippageFloor,
  getTradeDeadline,
  parseMarketId,
  parseTokenAmount,
} from "./utils"

interface OnchainContext {
  publicClient: PublicClient
  walletClient: WalletClient
}

interface TradeQuote {
  estimatedAmount: bigint
  fee: bigint
  executionPrice: bigint
}

export interface CreateMarketWriteResult {
  txHash: `0x${string}`
  marketId: string
}

export interface ResolveMarketWriteResult {
  txHash: `0x${string}`
  marketId: string
  resolvedOutcome: number
}

async function getConnectedAccount(walletClient: WalletClient): Promise<Address> {
  const account = walletClient.account?.address
  if (!account) {
    throw new Error("No wallet account connected.")
  }

  return account
}

async function getChainId(walletClient: WalletClient): Promise<number> {
  const chainId = walletClient.chain?.id
  if (!chainId) {
    throw new Error("Wallet chain is not available.")
  }

  return chainId
}

async function getCollateralDecimals(context: OnchainContext): Promise<number> {
  const chainId = await getChainId(context.walletClient)
  const contracts = getContractBundle(chainId)
  const decimals = (await context.publicClient.readContract({
    address: contracts.collateralToken,
    abi: erc20Abi,
    functionName: "decimals",
  })) as number

  return Number(decimals)
}

async function ensureAllowance(
  context: OnchainContext,
  owner: Address,
  requiredAmount: bigint
): Promise<void> {
  const chainId = await getChainId(context.walletClient)
  const contracts = getContractBundle(chainId)
  const allowance = (await context.publicClient.readContract({
    address: contracts.collateralToken,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, contracts.marketManager],
  })) as bigint

  if (allowance >= requiredAmount) {
    return
  }

  const approveSimulation = await context.publicClient.simulateContract({
    account: owner,
    address: contracts.collateralToken,
    abi: erc20Abi,
    functionName: "approve",
    args: [contracts.marketManager, maxUint256],
  })
  const approvalHash = await context.walletClient.writeContract(
    approveSimulation.request
  )
  await context.publicClient.waitForTransactionReceipt({ hash: approvalHash })
}

function formatAmountForMessage(value: bigint, decimals: number): string {
  return Number(formatUnits(value, decimals)).toFixed(6)
}

async function ensureCollateralBalance(
  context: OnchainContext,
  owner: Address,
  requiredAmount: bigint,
  collateralDecimals: number
): Promise<void> {
  const chainId = await getChainId(context.walletClient)
  const contracts = getContractBundle(chainId)
  const collateralBalance = (await context.publicClient.readContract({
    address: contracts.collateralToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [owner],
  })) as bigint

  if (collateralBalance >= requiredAmount) {
    return
  }

  const symbol = (await context.publicClient.readContract({
    address: contracts.collateralToken,
    abi: erc20Abi,
    functionName: "symbol",
  })) as string
  const missingAmount = requiredAmount - collateralBalance

  if (symbol.toUpperCase() !== "WETH") {
    throw new Error(
      `Insufficient ${symbol} balance. Need ${formatAmountForMessage(
        missingAmount,
        collateralDecimals
      )} more ${symbol}.`
    )
  }

  const nativeBalance = await context.publicClient.getBalance({ address: owner })
  if (nativeBalance < missingAmount) {
    throw new Error(
      `Insufficient ETH balance to wrap into WETH. Need at least ${formatAmountForMessage(
        missingAmount,
        18
      )} ETH plus gas.`
    )
  }

  const depositSimulation = await context.publicClient.simulateContract({
    account: owner,
    address: contracts.collateralToken,
    abi: wethAbi,
    functionName: "deposit",
    args: [],
    value: missingAmount,
  })
  const depositHash = await context.walletClient.writeContract(
    depositSimulation.request
  )
  await context.publicClient.waitForTransactionReceipt({ hash: depositHash })
}

export async function createMarketWithWallet(
  context: OnchainContext,
  input: CreateMarketInput
): Promise<CreateMarketWriteResult> {
  const account = await getConnectedAccount(context.walletClient)
  const chainId = await getChainId(context.walletClient)
  const contracts = getContractBundle(chainId)
  const collateralDecimals = await getCollateralDecimals(context)
  const endTime = BigInt(Math.floor(new Date(input.endTime).getTime() / 1000))
  const initialLiquidity = parseTokenAmount(
    input.initialLiquidity,
    collateralDecimals,
    "Initial liquidity"
  )

  await ensureCollateralBalance(
    context,
    account,
    initialLiquidity,
    collateralDecimals
  )
  await ensureAllowance(context, account, initialLiquidity)

  const simulation = await context.publicClient.simulateContract({
    account,
    address: contracts.marketManager,
    abi: zenGuessMarketManagerAbi,
    functionName: "createMarket",
    args: [
      input.question,
      input.resolutionSource,
      endTime,
      input.outcomes,
      initialLiquidity,
    ],
  })

  const txHash = await context.walletClient.writeContract(simulation.request)
  const receipt = await context.publicClient.waitForTransactionReceipt({
    hash: txHash,
  })

  const createdLogs = await context.publicClient.getContractEvents({
    address: contracts.marketManager,
    abi: zenGuessMarketManagerAbi,
    eventName: "MarketCreated",
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber,
    args: { creator: account },
  })
  const matchingLog = createdLogs.find((log) => log.transactionHash === txHash)
  const marketId = matchingLog?.args.marketId?.toString()
  if (!marketId) {
    throw new Error("Market created but MarketCreated event was not found.")
  }

  return {
    txHash,
    marketId,
  }
}

export async function submitTradeWithWallet(
  context: OnchainContext,
  input: SubmitTradeInput
): Promise<SubmitTradeOutput> {
  const account = await getConnectedAccount(context.walletClient)
  const chainId = await getChainId(context.walletClient)
  const contracts = getContractBundle(chainId)
  const collateralDecimals = await getCollateralDecimals(context)
  const marketId = parseMarketId(input.marketId)
  const outcomeIndex = input.outcomeIndex
  const deadline = getTradeDeadline()

  if (outcomeIndex < 0 || outcomeIndex > 255) {
    throw new Error("Invalid outcome index.")
  }

  const isBuy = input.side === "buy"
  const inputAmount = isBuy
    ? parseTokenAmount(input.amount, collateralDecimals, "Trade amount")
    : parseTokenAmount(input.amount, SHARE_DECIMALS, "Shares amount")

  if (isBuy) {
    await ensureCollateralBalance(
      context,
      account,
      inputAmount,
      collateralDecimals
    )
    await ensureAllowance(context, account, inputAmount)
  }

  const quote = (await context.publicClient.readContract({
    address: contracts.marketManager,
    abi: zenGuessMarketManagerAbi,
    functionName: "simulateTrade",
    args: [marketId, outcomeIndex, inputAmount, isBuy ? 0 : 1],
  })) as TradeQuote

  const minimumOutput = applySlippageFloor(quote.estimatedAmount, input.slippage)
  const simulation = await context.publicClient.simulateContract({
    account,
    address: contracts.marketManager,
    abi: zenGuessMarketManagerAbi,
    functionName: isBuy ? "buyShares" : "sellShares",
    args: isBuy
      ? [marketId, outcomeIndex, inputAmount, minimumOutput, deadline]
      : [marketId, outcomeIndex, inputAmount, minimumOutput, deadline],
  })

  const txHash = await context.walletClient.writeContract(simulation.request)
  const receipt = await context.publicClient.waitForTransactionReceipt({
    hash: txHash,
  })

  const tradeLogs = await context.publicClient.getContractEvents({
    address: contracts.marketManager,
    abi: zenGuessMarketManagerAbi,
    eventName: "TradeExecuted",
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber,
    args: { marketId, trader: account },
  })
  const tradeLog = tradeLogs.find((log) => log.transactionHash === txHash)
  if (!tradeLog) {
    throw new Error("Trade transaction succeeded but event parsing failed.")
  }

  const outcomes = (await context.publicClient.readContract({
    address: contracts.marketManager,
    abi: zenGuessMarketManagerAbi,
    functionName: "getMarketOutcomes",
    args: [marketId],
  })) as string[]

  const block = await context.publicClient.getBlock({
    blockNumber: receipt.blockNumber,
  })
  const side = Number(tradeLog.args.side ?? 0n) === 0 ? "buy" : "sell"
  const sharesRaw =
    side === "buy"
      ? tradeLog.args.outputAmount ?? 0n
      : tradeLog.args.inputAmount ?? 0n
  const totalRaw =
    side === "buy"
      ? tradeLog.args.inputAmount ?? 0n
      : tradeLog.args.outputAmount ?? 0n

  const shares = Number(formatUnits(sharesRaw, SHARE_DECIMALS))
  const total = Number(formatUnits(totalRaw, collateralDecimals))
  const price = shares > 0 ? total / shares : 0
  const parsedOutcomeIndex = Number(tradeLog.args.outcomeIndex ?? 0n)

  return {
    success: true,
    txHash,
    trade: {
      id: `${txHash}-${tradeLog.logIndex ?? 0}`,
      marketId: marketId.toString(),
      traderAddress: account,
      outcomeIndex: parsedOutcomeIndex,
      outcomeLabel:
        outcomes[parsedOutcomeIndex] ?? `Outcome ${parsedOutcomeIndex + 1}`,
      side,
      shares,
      price,
      total,
      timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
      txHash,
    },
  }
}

export async function claimWinningsWithWallet(
  context: OnchainContext,
  marketId: string
): Promise<ClaimWinningsOutput> {
  const account = await getConnectedAccount(context.walletClient)
  const chainId = await getChainId(context.walletClient)
  const contracts = getContractBundle(chainId)
  const collateralDecimals = await getCollateralDecimals(context)
  const parsedMarketId = parseMarketId(marketId)

  const simulation = await context.publicClient.simulateContract({
    account,
    address: contracts.marketManager,
    abi: zenGuessMarketManagerAbi,
    functionName: "claimWinnings",
    args: [parsedMarketId],
  })
  const txHash = await context.walletClient.writeContract(simulation.request)
  const receipt = await context.publicClient.waitForTransactionReceipt({
    hash: txHash,
  })

  const claimedLogs = await context.publicClient.getContractEvents({
    address: contracts.marketManager,
    abi: zenGuessMarketManagerAbi,
    eventName: "WinningsClaimed",
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber,
    args: { marketId: parsedMarketId, account },
  })
  const claimLog = claimedLogs.find((log) => log.transactionHash === txHash)
  const payout = claimLog?.args.payout ?? 0n

  return {
    success: true,
    amount: Number(formatUnits(payout, collateralDecimals)),
  }
}

export async function resolveMarketWithWallet(
  context: OnchainContext,
  input: ResolveMarketInput
): Promise<ResolveMarketWriteResult> {
  const account = await getConnectedAccount(context.walletClient)
  const chainId = await getChainId(context.walletClient)
  const contracts = getContractBundle(chainId)
  const marketId = parseMarketId(input.marketId)

  if (
    !Number.isInteger(input.resolvedOutcome) ||
    input.resolvedOutcome < 0 ||
    input.resolvedOutcome > 255
  ) {
    throw new Error("Resolved outcome must be an integer between 0 and 255.")
  }

  const simulation = await context.publicClient.simulateContract({
    account,
    address: contracts.marketManager,
    abi: zenGuessMarketManagerAbi,
    functionName: "resolveMarket",
    args: [marketId, input.resolvedOutcome],
  })
  const txHash = await context.walletClient.writeContract(simulation.request)
  await context.publicClient.waitForTransactionReceipt({
    hash: txHash,
  })

  return {
    txHash,
    marketId: marketId.toString(),
    resolvedOutcome: input.resolvedOutcome,
  }
}
