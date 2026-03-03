"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAccount, usePublicClient, useWalletClient } from "wagmi"
import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { defaultChain } from "@/lib/chains"
import { clientEnv } from "@/lib/env/client"
import { formatUSD } from "@/lib/format"
import {
  claimWinningsOnchain,
  isOnchainGatewayEnabled,
  submitTrade,
  submitTradeOnchain,
  simulateTrade,
} from "@/lib/contracts"
import { isWrongNetwork } from "@/lib/web3"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Market } from "@/data/types"
import { toUserFacingWeb3Error } from "@/lib/web3-errors"

const MIN_TRADE_AMOUNT = 1
const MIN_SELL_SHARES_AMOUNT = 0.01
const MAX_TRADE_AMOUNT = 1_000_000
const MIN_BUY_USD = 1
const MIN_BUY_ETH_FLOOR = 0.000001
const ETH_BUY_INPUT_STEP = 0.0001
const LARGE_TRADE_CONFIRM_THRESHOLD_USD = 5_000
const LARGE_SELL_SHARES_CONFIRM_THRESHOLD = 10_000
const MIN_SLIPPAGE = 0.1
const MAX_SLIPPAGE = 5
const BETTING_TOKEN_SYMBOL = clientEnv.NEXT_PUBLIC_BETTING_TOKEN_SYMBOL
const ETH_USD_REFERENCE = clientEnv.NEXT_PUBLIC_ETH_USD_REFERENCE
const TOKEN_AMOUNT_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
})

interface TradePanelProps {
  market: Market
  onTradeSuccess?: () => void
}

export function TradePanel({ market, onTradeSuccess }: TradePanelProps) {
  const router = useRouter()
  const { address, chainId, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient({ chainId: defaultChain.id })
  const [side, setSide] = useState<"buy" | "sell">("buy")
  const [outcomeIndex, setOutcomeIndex] = useState(0)
  const [amount, setAmount] = useState("")
  const [orderType, setOrderType] = useState<"market" | "limit">("market")
  const [slippage, setSlippage] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [estimate, setEstimate] = useState<{
    estimatedCost: number
    estimatedShares: number
    fee: number
  } | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const yesProb = market.outcomes[0]?.probability ?? 0.5
  const noProb = market.outcomes[1]?.probability ?? 0.5
  const isResolved = market.status === "resolved"
  const onchainMode = isOnchainGatewayEnabled()
  const isEthCollateral = BETTING_TOKEN_SYMBOL.toUpperCase() === "ETH"
  const wrongNetwork = isConnected && isWrongNetwork(chainId)
  const parsedAmount = Number(amount)

  function getMinTradeAmount(currentSide: "buy" | "sell"): number {
    if (onchainMode && currentSide === "sell") {
      return MIN_SELL_SHARES_AMOUNT
    }

    if (onchainMode && currentSide === "buy" && isEthCollateral) {
      return Math.max(MIN_BUY_USD / ETH_USD_REFERENCE, MIN_BUY_ETH_FLOOR)
    }

    return MIN_TRADE_AMOUNT
  }

  const minTradeAmount = getMinTradeAmount(side)

  function formatTokenAmount(amountValue: number): string {
    return TOKEN_AMOUNT_FORMATTER.format(amountValue)
  }

  function formatCollateralAmount(amountValue: number): string {
    const tokenAmount = `${formatTokenAmount(amountValue)} ${BETTING_TOKEN_SYMBOL}`
    if (!onchainMode || !isEthCollateral) {
      return tokenAmount
    }

    return `${tokenAmount} (${formatUSD(amountValue * ETH_USD_REFERENCE)})`
  }

  const canSubmit = useMemo(() => {
    if (!isConnected || wrongNetwork || isResolved || isSubmitting) {
      return false
    }
    if (amountError || !amount || Number.isNaN(parsedAmount)) {
      return false
    }
    return parsedAmount > 0
  }, [
    amount,
    amountError,
    isConnected,
    isResolved,
    isSubmitting,
    parsedAmount,
    wrongNetwork,
  ])

  function validateAmount(nextAmount: number): string | null {
    if (!Number.isFinite(nextAmount)) {
      return "Enter a valid amount."
    }

    const minAmount = getMinTradeAmount(side)
    if (nextAmount < minAmount) {
      if (onchainMode && side === "sell") {
        return `Shares must be at least ${MIN_SELL_SHARES_AMOUNT}.`
      }
      if (onchainMode && side === "buy" && isEthCollateral) {
        return `Amount must be at least ${formatTokenAmount(minAmount)} ETH (${formatUSD(MIN_BUY_USD)} minimum reference).`
      }

      return `Amount must be at least ${formatTokenAmount(minAmount)} ${BETTING_TOKEN_SYMBOL}.`
    }

    if (nextAmount > MAX_TRADE_AMOUNT) {
      if (onchainMode && side === "sell") {
        return "Shares amount exceeds maximum trade size."
      }
      return "Amount exceeds maximum trade size."
    }

    return null
  }

  function handleAmountChange(rawValue: string) {
    setAmount(rawValue)
    setFormError(null)

    if (!rawValue) {
      setAmountError(null)
      setEstimate(null)
      return
    }

    const nextAmount = Number(rawValue)
    if (!Number.isFinite(nextAmount)) {
      setAmountError("Enter a valid amount.")
      setEstimate(null)
      return
    }

    const validationMessage = validateAmount(nextAmount)
    setAmountError(validationMessage)
    if (validationMessage) {
      setEstimate(null)
    }
  }

  useEffect(() => {
    let active = true
    async function runSimulation() {
      if (amountError || !amount) {
        return
      }

      const nextAmount = Number(amount)
      if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
        return
      }

      try {
        const result = await simulateTrade({
          marketId: market.id,
          outcomeIndex,
          amount: nextAmount,
          side,
        })
        if (active) {
          setEstimate(result)
        }
      } catch {
        if (active) {
          setEstimate(null)
        }
      }
    }

    void runSimulation()

    return () => {
      active = false
    }
  }, [amount, amountError, market.id, outcomeIndex, side])

  async function handleSubmit() {
    const nextAmount = Number(amount)
    const validationMessage = validateAmount(nextAmount)
    if (validationMessage) {
      setAmountError(validationMessage)
      return
    }

    if (!isConnected || !address) {
      setFormError("Connect a wallet before trading.")
      return
    }

    if (wrongNetwork) {
      setFormError(`Switch to ${defaultChain.name} before trading.`)
      return
    }

    const tradeNotionalUsd =
      onchainMode && isEthCollateral
        ? nextAmount * ETH_USD_REFERENCE
        : nextAmount
    if (side === "buy" && tradeNotionalUsd >= LARGE_TRADE_CONFIRM_THRESHOLD_USD) {
      const confirmed = window.confirm(
        onchainMode && isEthCollateral
          ? `This trade is large (${formatTokenAmount(nextAmount)} ETH, about ${formatUSD(tradeNotionalUsd)}). Are you sure you want to continue?`
          : `This trade is large ($${nextAmount.toLocaleString()}). Are you sure you want to continue?`
      )
      if (!confirmed) {
        return
      }
    }
    if (side === "sell" && nextAmount >= LARGE_SELL_SHARES_CONFIRM_THRESHOLD) {
      const confirmed = window.confirm(
        `This sell size is large (${nextAmount.toLocaleString()} shares). Are you sure you want to continue?`
      )
      if (!confirmed) {
        return
      }
    }

    setIsSubmitting(true)
    setFormError(null)
    try {
      const result = onchainMode
        ? await (async () => {
            if (!walletClient || !publicClient) {
              throw new Error("Wallet client is not ready yet.")
            }
            return submitTradeOnchain(
              { walletClient, publicClient },
              {
                marketId: market.id,
                outcomeIndex,
                amount: nextAmount,
                side,
                slippage: slippage / 100,
                traderAddress: address,
              }
            )
          })()
        : await submitTrade({
            marketId: market.id,
            outcomeIndex,
            amount: nextAmount,
            side,
            slippage: slippage / 100,
            traderAddress: address,
          })

      if (result.success) {
        toast.success(
          `${side === "buy" ? "Bought" : "Sold"} ${
            market.outcomes[outcomeIndex]?.label ?? "Outcome"
          } shares`,
          {
            description: `Tx: ${result.txHash.slice(0, 10)}...`,
          }
        )
        setAmount("")
        setEstimate(null)
        onTradeSuccess?.()
        router.refresh()
      }
    } catch (submitError) {
      const message = toUserFacingWeb3Error(
        submitError,
        "Transaction failed. Please try again."
      )
      setFormError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleClaimWinnings() {
    if (!onchainMode) {
      toast.info("Claim flow is currently mocked and will be on-chain soon.")
      return
    }

    if (!walletClient || !publicClient) {
      toast.error("Wallet client is not ready yet.")
      return
    }

    try {
      const result = await claimWinningsOnchain(
        { walletClient, publicClient },
        { marketId: market.id }
      )
      toast.success("Winnings claimed successfully", {
        description: `Received ${formatCollateralAmount(result.amount)}.`,
      })
    } catch (claimError) {
      const message = toUserFacingWeb3Error(
        claimError,
        "Failed to claim winnings."
      )
      toast.error(message)
    }
  }

  if (isResolved) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Market Resolved</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-success/10">
              <ArrowUpRight className="size-6 text-success" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {market.outcomes[market.resolvedOutcome ?? 0]?.label}
              </p>
              <p className="text-xs text-muted-foreground">Winning outcome</p>
            </div>
            <Button
              className="w-full"
              variant="default"
              onClick={handleClaimWinnings}
              disabled={!isConnected}
            >
              {isConnected ? "Claim Winnings" : "Connect Wallet to Claim"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Trade</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Tabs value={side} onValueChange={(value) => setSide(value as "buy" | "sell")}>
          <TabsList className="w-full">
            <TabsTrigger value="buy" className="flex-1">
              <ArrowUpRight className="mr-1 size-3.5" />
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell" className="flex-1">
              <ArrowDownRight className="mr-1 size-3.5" />
              Sell
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <button
            onClick={() => setOutcomeIndex(0)}
            className={cn(
              "flex-1 rounded-lg border-2 px-3 py-2.5 text-center text-sm font-semibold transition-all",
              outcomeIndex === 0
                ? "border-success bg-success/10 text-success"
                : "border-border text-muted-foreground hover:border-success/40"
            )}
          >
            <div>{market.outcomes[0]?.label ?? "Yes"}</div>
            <div className="text-xs opacity-75">{Math.round(yesProb * 100)}%</div>
          </button>
          <button
            onClick={() => setOutcomeIndex(1)}
            className={cn(
              "flex-1 rounded-lg border-2 px-3 py-2.5 text-center text-sm font-semibold transition-all",
              outcomeIndex === 1
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-border text-muted-foreground hover:border-destructive/40"
            )}
          >
            <div>{market.outcomes[1]?.label ?? "No"}</div>
            <div className="text-xs opacity-75">{Math.round(noProb * 100)}%</div>
          </button>
        </div>

        <div className="flex gap-2">
          {(["market", "limit"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                orderType === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount" className="text-xs">
            {onchainMode
              ? side === "buy"
                ? `Amount (${BETTING_TOKEN_SYMBOL})`
                : "Shares"
              : `Amount (${BETTING_TOKEN_SYMBOL})`}
          </Label>
          <Input
            id="amount"
            type="number"
            min={minTradeAmount}
            max={MAX_TRADE_AMOUNT}
            step={
              onchainMode && side === "sell"
                ? "0.01"
                : onchainMode && side === "buy" && isEthCollateral
                  ? String(ETH_BUY_INPUT_STEP)
                  : "1"
            }
            placeholder="0.00"
            value={amount}
            onChange={(event) => handleAmountChange(event.target.value)}
            aria-invalid={Boolean(amountError)}
            data-testid="trade-amount-input"
          />
          {amountError ? (
            <p className="text-xs text-destructive">{amountError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {onchainMode && side === "sell"
                ? `Min ${MIN_SELL_SHARES_AMOUNT} shares, max ${MAX_TRADE_AMOUNT.toLocaleString()} shares.`
                : onchainMode && side === "buy" && isEthCollateral
                  ? `Min ${formatTokenAmount(minTradeAmount)} ETH (${formatUSD(MIN_BUY_USD)} minimum reference), max ${MAX_TRADE_AMOUNT.toLocaleString()} ETH.`
                  : `Min ${formatTokenAmount(minTradeAmount)} ${BETTING_TOKEN_SYMBOL}, max ${MAX_TRADE_AMOUNT.toLocaleString()} ${BETTING_TOKEN_SYMBOL}.`}
            </p>
          )}
          <div className="flex gap-1">
            {(onchainMode && side === "sell"
              ? [1, 5, 10, 25]
              : onchainMode && side === "buy" && isEthCollateral
                ? [0.001, 0.005, 0.01, 0.05]
                : [0.01, 0.05, 0.1, 0.25]
            ).map((preset) => (
              <button
                key={preset}
                onClick={() => handleAmountChange(String(preset))}
                className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {onchainMode && side === "sell"
                  ? `${preset} sh`
                  : `${preset} ${BETTING_TOKEN_SYMBOL}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Slippage Tolerance</Label>
            <span className="text-xs text-muted-foreground">
              {slippage.toFixed(1)}%
            </span>
          </div>
          <Slider
            value={[slippage]}
            onValueChange={(values) =>
              setSlippage(
                Math.max(
                  MIN_SLIPPAGE,
                  Math.min(MAX_SLIPPAGE, values[0] ?? MIN_SLIPPAGE)
                )
              )
            }
            min={MIN_SLIPPAGE}
            max={MAX_SLIPPAGE}
            step={0.1}
            className="w-full"
          />
        </div>

        {estimate ? (
          <div className="rounded-lg bg-muted/50 p-3 text-xs" data-testid="trade-estimate">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Est. shares</span>
              <span className="font-medium text-foreground">
                {estimate.estimatedShares.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {side === "buy" ? "Est. cost" : "Est. proceeds"}
              </span>
              <span className="font-medium text-foreground">
                {onchainMode
                  ? formatCollateralAmount(estimate.estimatedCost)
                  : formatUSD(estimate.estimatedCost)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Fee</span>
              <span className="font-medium text-foreground">
                {onchainMode
                  ? formatCollateralAmount(estimate.fee)
                  : formatUSD(estimate.fee)}
              </span>
            </div>
          </div>
        ) : null}

        {formError ? <p className="text-xs text-destructive">{formError}</p> : null}

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full"
          data-testid="trade-submit-button"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-1.5 size-4 animate-spin" />
              Submitting...
            </>
          ) : !isConnected ? (
            "Connect Wallet to Trade"
          ) : wrongNetwork ? (
            `Switch to ${defaultChain.name}`
          ) : (
            `${side === "buy" ? "Buy" : "Sell"} ${
              market.outcomes[outcomeIndex]?.label ?? "Outcome"
            }`
          )}
        </Button>

        <p className="text-center text-[10px] text-muted-foreground">
          {onchainMode
            ? "Trades execute directly against ZenGuessMarketManager on Horizen."
            : `${BETTING_TOKEN_SYMBOL} mode is simulated until the ETH-collateral contract deployment is complete.`}
        </p>
      </CardContent>
    </Card>
  )
}
