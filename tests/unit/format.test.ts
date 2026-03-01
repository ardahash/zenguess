import { describe, expect, it } from "vitest"
import {
  formatAddress,
  formatOddsPercentage,
  formatPercent,
  formatUSD,
} from "@/lib/format"

describe("formatting utils", () => {
  it("formats USD amounts with two decimals", () => {
    expect(formatUSD(1234.5)).toBe("$1,234.50")
  })

  it("formats probability to percent string", () => {
    expect(formatPercent(0.625)).toBe("62.5%")
    expect(formatOddsPercentage(1.4)).toBe("100%")
    expect(formatOddsPercentage(-1)).toBe("0%")
  })

  it("shortens wallet addresses", () => {
    expect(formatAddress("0x1000000000000000000000000000000000000001")).toBe(
      "0x1000...0001"
    )
  })
})
