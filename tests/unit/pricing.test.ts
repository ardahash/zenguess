import { describe, expect, it } from "vitest"
import { clampProbability, simulateTradeMath } from "@/lib/pricing"

describe("trade simulation math", () => {
  it("clamps probabilities to valid range", () => {
    expect(clampProbability(Number.NaN)).toBe(0.5)
    expect(clampProbability(0)).toBe(0.01)
    expect(clampProbability(2)).toBe(0.99)
  })

  it("simulates buy trades with fees", () => {
    const result = simulateTradeMath({
      amountUsd: 100,
      probability: 0.5,
      side: "buy",
      feeRate: 0.02,
    })

    expect(result.fee).toBe(2)
    expect(result.estimatedCost).toBe(100)
    expect(result.estimatedShares).toBeCloseTo(196, 5)
  })

  it("simulates sell trades with proceeds net of fees", () => {
    const result = simulateTradeMath({
      amountUsd: 100,
      probability: 0.6,
      side: "sell",
      feeRate: 0.02,
    })

    expect(result.fee).toBe(2)
    expect(result.estimatedCost).toBe(98)
    expect(result.estimatedShares).toBeCloseTo(60, 5)
  })
})
