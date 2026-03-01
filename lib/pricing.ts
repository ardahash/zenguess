export interface TradeSimulationInput {
  amountUsd: number
  probability: number
  side: "buy" | "sell"
  feeRate?: number
}

export interface TradeSimulationResult {
  estimatedCost: number
  estimatedShares: number
  fee: number
  averagePrice: number
}

export interface PriceHistoryPoint {
  date: string
  yes: number
  no: number
}

export function clampProbability(probability: number): number {
  if (!Number.isFinite(probability)) {
    return 0.5
  }

  return Math.max(0.01, Math.min(0.99, probability))
}

export function simulateTradeMath({
  amountUsd,
  probability,
  side,
  feeRate = 0.02,
}: TradeSimulationInput): TradeSimulationResult {
  const safeAmount = Math.max(0, Number.isFinite(amountUsd) ? amountUsd : 0)
  const safeProbability = clampProbability(probability)
  const safeFeeRate = Math.max(0, Math.min(0.1, feeRate))

  const fee = safeAmount * safeFeeRate
  const notional = Math.max(0, safeAmount - fee)
  const estimatedShares =
    side === "buy"
      ? notional / safeProbability
      : safeAmount * safeProbability
  const estimatedCost = side === "buy" ? safeAmount : notional

  return {
    estimatedCost,
    estimatedShares,
    fee,
    averagePrice: safeProbability,
  }
}

export function generatePriceHistory(
  startProb: number,
  endProb: number,
  days: number
): PriceHistoryPoint[] {
  const data: PriceHistoryPoint[] = []
  const now = Date.now()

  for (let i = days; i >= 0; i -= 1) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000)
    const progress = (days - i) / Math.max(days, 1)
    const base = startProb + (endProb - startProb) * progress
    const noiseSeed = Math.sin((i + 1) * 97 + startProb * 137 + endProb * 83)
    const noise = noiseSeed * 0.04
    const yes = Math.max(0.01, Math.min(0.99, base + noise))

    data.push({
      date: date.toISOString().split("T")[0] ?? date.toISOString(),
      yes: Math.round(yes * 100),
      no: Math.round((1 - yes) * 100),
    })
  }

  return data
}
