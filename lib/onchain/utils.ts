import { formatUnits, parseUnits } from "viem"

export const SHARE_DECIMALS = 18
const BPS_DENOMINATOR = 10_000n

export function parseMarketId(marketId: string): bigint {
  const normalized = marketId.trim()
  if (/^\d+$/.test(normalized)) {
    return BigInt(normalized)
  }

  const suffix = normalized.match(/^market_(\d+)$/)?.[1]
  if (suffix) {
    return BigInt(suffix)
  }

  throw new Error("Invalid on-chain market id.")
}

export function formatTokenAmount(value: bigint, decimals: number): number {
  const normalized = formatUnits(value, decimals)
  return Number(normalized)
}

export function parseTokenAmount(
  value: number,
  decimals: number,
  label: string
): bigint {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than 0.`)
  }

  return parseUnits(value.toString(), decimals)
}

export function applySlippageFloor(value: bigint, slippage: number): bigint {
  if (!Number.isFinite(slippage) || slippage < 0 || slippage > 1) {
    throw new Error("Invalid slippage value.")
  }

  const slippageBps = BigInt(Math.floor(slippage * 10_000))
  const keepBps = BPS_DENOMINATOR - slippageBps
  return (value * keepBps) / BPS_DENOMINATOR
}

export function getTradeDeadline(secondsFromNow: number = 15 * 60): bigint {
  const nowSeconds = Math.floor(Date.now() / 1000)
  return BigInt(nowSeconds + secondsFromNow)
}
