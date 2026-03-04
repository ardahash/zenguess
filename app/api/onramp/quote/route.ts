import { NextResponse } from "next/server"
import { z } from "zod"
import { clientEnv } from "@/lib/env/client"
import { serverEnv } from "@/lib/env/server"
import {
  fetchOnrampQuote,
  fetchSupportedOnrampChains,
  type OnrampAsset,
} from "@/lib/onramp/layerzero"

export const dynamic = "force-dynamic"

function getOnrampAvailability() {
  if (!clientEnv.NEXT_PUBLIC_ONRAMP_ENABLED) {
    return {
      enabled: false as const,
      reason: "Crosschain onramp is disabled by NEXT_PUBLIC_ONRAMP_ENABLED.",
    }
  }

  if (!serverEnv.LAYERZERO_API_KEY) {
    return {
      enabled: false as const,
      reason: "Missing LAYERZERO_API_KEY on the server environment.",
    }
  }

  return { enabled: true as const, reason: null }
}

const quoteRequestSchema = z.object({
  sourceChainKey: z.string().trim().min(1).max(64),
  asset: z.enum(["ETH", "USDC"]),
  amount: z.number().finite().positive().max(1_000_000),
  recipient: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/),
})
const chainDiscoveryQuerySchema = z.object({
  asset: z.enum(["ETH", "USDC"]).optional(),
})

// GET /api/onramp/quote
export async function GET(request: Request) {
  const availability = getOnrampAvailability()
  if (!availability.enabled) {
    return NextResponse.json(
      { error: availability.reason },
      { status: 503 }
    )
  }

  const url = new URL(request.url)
  const parsedQuery = chainDiscoveryQuerySchema.safeParse({
    asset: url.searchParams.get("asset") ?? undefined,
  })
  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters.",
        details: parsedQuery.error.flatten(),
      },
      { status: 400 }
    )
  }

  try {
    const chains = await fetchSupportedOnrampChains(parsedQuery.data.asset)
    return NextResponse.json(
      { data: { chains } },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load onramp chains."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/onramp/quote
export async function POST(request: Request) {
  const availability = getOnrampAvailability()
  if (!availability.enabled) {
    return NextResponse.json(
      { error: availability.reason },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsedBody = quoteRequestSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: "Invalid onramp quote payload.",
        details: parsedBody.error.flatten(),
      },
      { status: 400 }
    )
  }

  const payload = parsedBody.data as {
    sourceChainKey: string
    asset: OnrampAsset
    amount: number
    recipient: string
  }

  try {
    const quote = await fetchOnrampQuote(payload)
    return NextResponse.json(
      { data: quote },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch onramp quote."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
