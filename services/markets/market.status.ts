import type { MarketEntity, MarketStatus } from "./market.types"

export function deriveMarketStatus(
  market: MarketEntity,
  nowMs: number = Date.now()
): MarketStatus {
  if (market.status === "resolved") {
    return "resolved"
  }

  if (Date.parse(market.endTime) <= nowMs) {
    return "closed"
  }

  return "open"
}

export function withDerivedStatus(
  market: MarketEntity,
  nowMs: number = Date.now()
): MarketEntity {
  return {
    ...market,
    status: deriveMarketStatus(market, nowMs),
  }
}
