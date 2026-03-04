import { clientEnv } from "@/lib/env/client"

export function toUserFacingWeb3Error(
  error: unknown,
  fallback: string = "Transaction failed. Please try again."
): string {
  const message = extractErrorMessage(error).toLowerCase()
  const onrampHint =
    clientEnv.NEXT_PUBLIC_COLLATERAL_MODE === "usdce"
      ? " Bridge USDC to Horizen from the Onramp page and retry."
      : ""

  if (message.includes("user rejected")) {
    return "Transaction was rejected in your wallet."
  }

  if (
    message.includes("transfer amount exceeds balance") ||
    message.includes("insufficient balance")
  ) {
    return `Insufficient betting-token balance for this transaction. Reduce amount or fund your wallet.${onrampHint}`
  }

  if (message.includes("insufficient allowance")) {
    return "Collateral token allowance is too low. Approve token spending and retry."
  }

  if (message.includes("insufficient funds")) {
    return "Insufficient ETH for gas fees. Add gas funds and retry."
  }

  if (message.includes("deadlineexpired") || message.includes("deadline expired")) {
    return "Transaction deadline expired before confirmation. Retry."
  }

  if (message.includes("invalidmarketstate")) {
    return "Market is no longer open for this action."
  }

  if (message.includes("invalidoutcome")) {
    return "Selected outcome is invalid for this market."
  }

  if (message.includes("nothingtoclaim")) {
    return "No claimable winnings found for this wallet."
  }

  if (message.includes("alreadyclaimed")) {
    return "Winnings were already claimed for this market."
  }

  return extractErrorMessage(error) || fallback
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === "string") {
    return error
  }

  return ""
}
