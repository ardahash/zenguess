"use client"

import { useEffect, useMemo, useState } from "react"
import { useAccount } from "wagmi"
import { ArrowLeftRight, ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatAddress, formatUSD } from "@/lib/format"
import { toUserFacingWeb3Error } from "@/lib/web3-errors"
import { clientEnv } from "@/lib/env/client"

type OnrampAsset = "ETH" | "USDC"
const ONRAMP_ENABLED = clientEnv.NEXT_PUBLIC_ONRAMP_ENABLED

interface OnrampChainOption {
  chainKey: string
  name: string
  chainId: number
}

interface OnrampUserStepTransaction {
  type: "TRANSACTION"
  signerAddress?: string
  chainKey?: string
  chainType: "EVM" | string
  transaction: {
    encoded: {
      chainId: number
      from?: string
      to: string
      data: string
      value?: string
      gasLimit?: string
    }
  }
}

interface OnrampQuote {
  requestId: string
  sourceChainKey: string
  destinationChainKey: string
  sourceToken: {
    symbol: string
    address: string
    chainKey: string
    decimals: number
  }
  destinationToken: {
    symbol: string
    address: string
    chainKey: string
    decimals: number
  }
  amountIn: number
  amountOut: number
  amountOutMin: number
  routeType: string
  feeUsd?: string
  feePercent?: string
  userSteps: Array<OnrampUserStepTransaction | { type: string }>
}

function decimalOrHexToHex(value?: string): string {
  if (!value || value === "0") {
    return "0x0"
  }

  if (value.startsWith("0x")) {
    return value
  }

  return `0x${BigInt(value).toString(16)}`
}

function chainIdToHex(chainId: number): string {
  return `0x${chainId.toString(16)}`
}

export default function OnrampPage() {
  const { address, isConnected } = useAccount()
  const [chains, setChains] = useState<OnrampChainOption[]>([])
  const [chainsError, setChainsError] = useState<string | null>(null)
  const [isLoadingChains, setIsLoadingChains] = useState(true)

  const [sourceChainKey, setSourceChainKey] = useState("")
  const [asset, setAsset] = useState<OnrampAsset>("USDC")
  const [amount, setAmount] = useState("100")
  const [recipient, setRecipient] = useState("")

  const [quote, setQuote] = useState<OnrampQuote | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [isQuoting, setIsQuoting] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)

  useEffect(() => {
    if (address) {
      setRecipient(address)
    }
  }, [address])

  useEffect(() => {
    if (!ONRAMP_ENABLED) {
      return
    }

    let active = true
    const controller = new AbortController()

    async function loadChains() {
      try {
        setIsLoadingChains(true)
        setChainsError(null)
        const response = await fetch(
          `/api/onramp/quote?asset=${encodeURIComponent(asset)}`,
          {
          signal: controller.signal,
          cache: "no-store",
          }
        )
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string }
          throw new Error(payload.error ?? "Failed to load onramp chains.")
        }

        const payload = (await response.json()) as {
          data: { chains: OnrampChainOption[] }
        }
        if (!active) {
          return
        }

        setChains(payload.data.chains)
        setSourceChainKey((current) => {
          if (
            current &&
            payload.data.chains.some((chain) => chain.chainKey === current)
          ) {
            return current
          }

          return payload.data.chains[0]?.chainKey ?? ""
        })
      } catch (error) {
        if (!active || controller.signal.aborted) {
          return
        }
        setChainsError(
          error instanceof Error ? error.message : "Failed to load source chains."
        )
      } finally {
        if (active && !controller.signal.aborted) {
          setIsLoadingChains(false)
        }
      }
    }

    void loadChains()

    return () => {
      active = false
      controller.abort()
    }
  }, [asset])

  const parsedAmount = Number(amount)
  const canRequestQuote = useMemo(() => {
    return (
      Boolean(sourceChainKey) &&
      Boolean(recipient) &&
      /^0x[a-fA-F0-9]{40}$/.test(recipient) &&
      Number.isFinite(parsedAmount) &&
      parsedAmount > 0
    )
  }, [parsedAmount, recipient, sourceChainKey])

  async function handleRequestQuote() {
    if (!ONRAMP_ENABLED) {
      return
    }

    if (!canRequestQuote) {
      setQuoteError("Enter a valid amount and recipient address.")
      return
    }

    setIsQuoting(true)
    setQuoteError(null)
    setQuote(null)
    try {
      const response = await fetch("/api/onramp/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceChainKey,
          asset,
          amount: parsedAmount,
          recipient,
        }),
      })
      const payload = (await response.json()) as {
        data?: OnrampQuote
        error?: string
      }
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Failed to fetch bridge quote.")
      }

      setQuote(payload.data)
      toast.success("Bridge quote loaded.")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch bridge quote."
      setQuoteError(message)
      toast.error(message)
    } finally {
      setIsQuoting(false)
    }
  }

  async function handleExecute() {
    if (!ONRAMP_ENABLED) {
      return
    }

    if (!quote) {
      return
    }

    const provider = (window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum
    if (!provider) {
      toast.error("No injected wallet provider found.")
      return
    }

    const txSteps = quote.userSteps.filter(
      (step): step is OnrampUserStepTransaction => step.type === "TRANSACTION"
    )
    if (!txSteps.length) {
      toast.error("No executable transaction steps in this quote.")
      return
    }

    setIsExecuting(true)
    try {
      for (const step of txSteps) {
        if (step.chainType !== "EVM") {
          throw new Error(`Unsupported step chain type: ${step.chainType}`)
        }

        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chainIdToHex(step.transaction.encoded.chainId) }],
        })

        const encodedTx = step.transaction.encoded
        const txHash = (await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: encodedTx.from ?? step.signerAddress,
              to: encodedTx.to,
              data: encodedTx.data,
              value: decimalOrHexToHex(encodedTx.value),
              gas: encodedTx.gasLimit
                ? decimalOrHexToHex(encodedTx.gasLimit)
                : undefined,
            },
          ],
        })) as string

        toast.success("Bridge transaction submitted.", {
          description: `Tx: ${txHash.slice(0, 10)}...`,
        })
      }
    } catch (error) {
      toast.error(toUserFacingWeb3Error(error, "Bridge execution failed."))
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Crosschain Onramp</h1>
        <p className="text-sm text-muted-foreground">
          Bridge USDC from your source chain to Horizen, then trade USDC.e
          markets on ZenGuess.
        </p>
        <a
          href="https://layerzero.network/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex"
        >
          <Badge variant="outline" className="text-xs">
            Powered by LayerZero
            <ExternalLink className="ml-1 size-3" />
          </Badge>
        </a>
      </div>

      {!ONRAMP_ENABLED ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Crosschain onramp is disabled. Set
            ` NEXT_PUBLIC_ONRAMP_ENABLED=true ` and ensure
            ` LAYERZERO_API_KEY ` is configured on the server.
          </CardContent>
        </Card>
      ) : null}

      <Card className={!ONRAMP_ENABLED ? "opacity-60" : undefined}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="size-4" />
            Bridge Quote
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Source Chain</Label>
              <Select value={sourceChainKey} onValueChange={setSourceChainKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source chain" />
                </SelectTrigger>
                <SelectContent>
                  {chains.map((chain) => (
                    <SelectItem key={chain.chainKey} value={chain.chainKey}>
                      {chain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Asset</Label>
              <Select
                value={asset}
                onValueChange={(value) => setAsset(value as OnrampAsset)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDC">USDC / USDC.e</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Recommended: bridge USDC to receive USDC.e on Horizen for
                trading collateral.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="onrampAmount">Amount</Label>
              <Input
                id="onrampAmount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="100"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="onrampRecipient">Recipient (Horizen)</Label>
              <Input
                id="onrampRecipient"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                placeholder="0x..."
              />
            </div>
          </div>

          {chainsError ? (
            <p className="text-xs text-destructive">{chainsError}</p>
          ) : chains.length === 0 && !isLoadingChains ? (
            <p className="text-xs text-muted-foreground">
              No supported {asset} route to Horizen is currently available from
              the configured source chains.
            </p>
          ) : null}
          {asset === "ETH" ? (
            <p className="text-xs text-muted-foreground">
              If ETH routes are unavailable, switch to USDC and bridge to
              USDC.e first.
            </p>
          ) : null}
          {quoteError ? <p className="text-xs text-destructive">{quoteError}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleRequestQuote}
              disabled={!ONRAMP_ENABLED || !canRequestQuote || isLoadingChains || isQuoting}
            >
              {isQuoting ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Loading Quote...
                </>
              ) : (
                "Get Quote"
              )}
            </Button>
            <a
              href="https://stargate.finance/transfer"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button variant="outline" type="button">
                Open Stargate
                <ExternalLink className="ml-1.5 size-3.5" />
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {quote ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quote Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex justify-between border-b border-border py-1.5">
              <span className="text-muted-foreground">Request</span>
              <span className="font-mono text-xs">{quote.requestId}</span>
            </div>
            <div className="flex justify-between border-b border-border py-1.5">
              <span className="text-muted-foreground">From</span>
              <span>
                {quote.amountIn.toFixed(6)} {quote.sourceToken.symbol}
              </span>
            </div>
            <div className="flex justify-between border-b border-border py-1.5">
              <span className="text-muted-foreground">Est. Receive</span>
              <span>
                {quote.amountOut.toFixed(6)} {quote.destinationToken.symbol}
              </span>
            </div>
            <div className="flex justify-between border-b border-border py-1.5">
              <span className="text-muted-foreground">Min Receive</span>
              <span>
                {quote.amountOutMin.toFixed(6)} {quote.destinationToken.symbol}
              </span>
            </div>
            <div className="flex justify-between border-b border-border py-1.5">
              <span className="text-muted-foreground">Route Type</span>
              <span>{quote.routeType}</span>
            </div>
            <div className="flex justify-between border-b border-border py-1.5">
              <span className="text-muted-foreground">Fee (USD)</span>
              <span>
                {quote.feeUsd ? formatUSD(Number(quote.feeUsd)) : "N/A"}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Recipient</span>
              <span className="font-mono">
                {isConnected && address
                  ? formatAddress(address)
                  : formatAddress(recipient)}
              </span>
            </div>

            <Button onClick={handleExecute} disabled={isExecuting}>
              {isExecuting ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Executing...
                </>
              ) : (
                "Execute Bridge In Wallet"
              )}
            </Button>

            <p className="text-xs text-muted-foreground">
              Execution runs LayerZero quote transaction steps from your wallet.
              Keep this tab open until all steps complete.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
