import { clientEnv } from "@/lib/env/client"

export const COLLATERAL_SYMBOL = clientEnv.NEXT_PUBLIC_BETTING_TOKEN_SYMBOL

const TOKEN_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
})

function formatRawAmount(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "0"
  }

  return TOKEN_FORMATTER.format(amount)
}

function trimTrailingZeros(value: string): string {
  return value.replace(/\.?0+$/, "")
}

export function formatCollateralAmount(amount: number): string {
  return `${formatRawAmount(amount)} ${COLLATERAL_SYMBOL}`
}

export function formatCollateralCompact(amount: number): string {
  if (!Number.isFinite(amount)) {
    return `0 ${COLLATERAL_SYMBOL}`
  }

  const absoluteAmount = Math.abs(amount)
  if (absoluteAmount >= 1_000_000) {
    return `${trimTrailingZeros((amount / 1_000_000).toFixed(1))}M ${COLLATERAL_SYMBOL}`
  }
  if (absoluteAmount >= 1_000) {
    return `${trimTrailingZeros((amount / 1_000).toFixed(1))}K ${COLLATERAL_SYMBOL}`
  }
  if (absoluteAmount >= 1) {
    return `${trimTrailingZeros(amount.toFixed(2))} ${COLLATERAL_SYMBOL}`
  }

  return `${trimTrailingZeros(amount.toFixed(6))} ${COLLATERAL_SYMBOL}`
}
