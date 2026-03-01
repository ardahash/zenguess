import { describe, expect, it } from "vitest"
import { deriveMarketStatus } from "@/services/markets/market.status"
import type { MarketEntity } from "@/services/markets/market.types"

const baseMarket: MarketEntity = {
  id: "market_test",
  question: "Will this pass?",
  description: "Test market",
  category: "crypto",
  status: "open",
  outcomes: [
    { label: "Yes", probability: 0.5 },
    { label: "No", probability: 0.5 },
  ],
  endTime: "2026-03-10T00:00:00.000Z",
  createdAt: "2026-03-01T00:00:00.000Z",
  volume: 0,
  liquidity: 0,
  resolutionSource: "Test",
  tags: [],
  creatorAddress: "0x1000000000000000000000000000000000000001",
}

describe("market status transitions", () => {
  it("keeps resolved markets resolved", () => {
    const status = deriveMarketStatus(
      { ...baseMarket, status: "resolved" },
      Date.parse("2026-03-11T00:00:00.000Z")
    )
    expect(status).toBe("resolved")
  })

  it("transitions open market to closed after end time", () => {
    const status = deriveMarketStatus(
      baseMarket,
      Date.parse("2026-03-11T00:00:00.000Z")
    )
    expect(status).toBe("closed")
  })

  it("keeps market open before end time", () => {
    const status = deriveMarketStatus(
      baseMarket,
      Date.parse("2026-03-05T00:00:00.000Z")
    )
    expect(status).toBe("open")
  })
})
