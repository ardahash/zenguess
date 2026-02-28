"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { simulateTrade, submitTrade } from "@/lib/contracts"
import { formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Market } from "@/data/types"

interface TradePanelProps {
  market: Market
}

export function TradePanel({ market }: TradePanelProps) {
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

  const yesProb = market.outcomes[0]?.probability ?? 0.5
  const noProb = market.outcomes[1]?.probability ?? 0.5
  const isResolved = market.status === "resolved"

  async function handleAmountChange(val: string) {
    setAmount(val)
    const num = parseFloat(val)
    if (isNaN(num) || num <= 0) {
      setEstimate(null)
      return
    }
    const result = await simulateTrade({
      marketId: market.id,
      outcomeIndex,
      amount: num,
      side,
    })
    setEstimate(result)
  }

  async function handleSubmit() {
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) return

    setIsSubmitting(true)
    try {
      const result = await submitTrade({
        marketId: market.id,
        outcomeIndex,
        amount: num,
        side,
        slippage: slippage / 100,
      })
      if (result.success) {
        toast.success(
          `${side === "buy" ? "Bought" : "Sold"} ${market.outcomes[outcomeIndex].label} shares`,
          {
            description: `Tx: ${result.txHash.slice(0, 10)}...`,
          }
        )
        setAmount("")
        setEstimate(null)
      }
    } catch {
      toast.error("Transaction failed. Please try again.")
    } finally {
      setIsSubmitting(false)
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
            <Button className="w-full" variant="default">
              Claim Winnings
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
        {/* Buy / Sell toggle */}
        <Tabs value={side} onValueChange={(v) => setSide(v as "buy" | "sell")}>
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

        {/* Outcome selector */}
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
            <div className="text-xs opacity-75">
              {Math.round(yesProb * 100)}%
            </div>
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
            <div className="text-xs opacity-75">
              {Math.round(noProb * 100)}%
            </div>
          </button>
        </div>

        {/* Order type */}
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

        {/* Amount input */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount" className="text-xs">
            Amount (USD)
          </Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="1"
            placeholder="0.00"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
          />
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

        {/* Slippage */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Slippage Tolerance</Label>
            <span className="text-xs text-muted-foreground">{slippage}%</span>
          </div>
          <Slider
            value={[slippage]}
            onValueChange={(v) => setSlippage(v[0])}
            min={0.1}
            max={5}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Estimate */}
        {estimate && (
          <div className="rounded-lg bg-muted/50 p-3 text-xs">
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
        )}

        {/* Submit button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-1.5 size-4 animate-spin" />
              Submitting...
            </>
          ) : (
            `${side === "buy" ? "Buy" : "Sell"} ${market.outcomes[outcomeIndex]?.label}`
          )}
        </Button>

        <p className="text-center text-[10px] text-muted-foreground">
          Trades are simulated. Smart contracts coming soon.
        </p>
      </CardContent>
    </Card>
  )
}
