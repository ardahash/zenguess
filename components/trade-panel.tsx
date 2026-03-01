"use client"

import { useEffect, useMemo, useState } from "react"
import { useAccount } from "wagmi"
import { z } from "zod"
import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { defaultChain } from "@/lib/chains"
import { formatUSD } from "@/lib/format"
import { submitTrade, simulateTrade } from "@/lib/contracts"
import { isWrongNetwork } from "@/lib/web3"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Market } from "@/data/types"

const MIN_TRADE_AMOUNT = 1
const MAX_TRADE_AMOUNT = 1_000_000
const LARGE_TRADE_CONFIRM_THRESHOLD = 5_000
const MIN_SLIPPAGE = 0.1
const MAX_SLIPPAGE = 5

const amountSchema = z
  .number()
  .finite()
  .min(MIN_TRADE_AMOUNT, `Amount must be at least $${MIN_TRADE_AMOUNT}.`)
  .max(MAX_TRADE_AMOUNT, `Amount exceeds maximum trade size.`)

interface TradePanelProps {
  market: Market
}

export function TradePanel({ market }: TradePanelProps) {
  const { address, chainId, isConnected } = useAccount()
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
  const wrongNetwork = isConnected && isWrongNetwork(chainId)
  const parsedAmount = Number(amount)

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
    const parsed = amountSchema.safeParse(nextAmount)
    if (!parsed.success) {
      return parsed.error.issues[0]?.message ?? "Invalid amount."
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

    if (nextAmount >= LARGE_TRADE_CONFIRM_THRESHOLD) {
      const confirmed = window.confirm(
        `This trade is large ($${nextAmount.toLocaleString()}). Are you sure you want to continue?`
      )
      if (!confirmed) {
        return
      }
    }

    setIsSubmitting(true)
    setFormError(null)
    try {
      const result = await submitTrade({
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
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Transaction failed. Please try again."
      setFormError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleClaimWinnings() {
    toast.info("Claim flow is currently mocked and will be on-chain soon.")
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
            Amount (USD)
          </Label>
          <Input
            id="amount"
            type="number"
            min={MIN_TRADE_AMOUNT}
            max={MAX_TRADE_AMOUNT}
            step="1"
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
              Min ${MIN_TRADE_AMOUNT}, max ${MAX_TRADE_AMOUNT.toLocaleString()}.
            </p>
          )}
          <div className="flex gap-1">
            {[10, 25, 50, 100].map((preset) => (
              <button
                key={preset}
                onClick={() => handleAmountChange(String(preset))}
                className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                ${preset}
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
              <span className="text-muted-foreground">Est. cost</span>
              <span className="font-medium text-foreground">
                {formatUSD(estimate.estimatedCost)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Fee</span>
              <span className="font-medium text-foreground">
                {formatUSD(estimate.fee)}
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
          Trades are simulated via mock gateway until contracts are deployed.
        </p>
      </CardContent>
    </Card>
  )
}
