import { NextResponse } from "next/server"
import { z } from "zod"
import {
  fetchOnrampQuote,
  fetchSupportedOnrampChains,
  type OnrampAsset,
} from "@/lib/onramp/layerzero"

export const dynamic = "force-dynamic"
const ONRAMP_ENABLED = false

const quoteRequestSchema = z.object({
  sourceChainKey: z.string().trim().min(1).max(64),
  asset: z.enum(["ETH", "USDC"]),
  amount: z.number().finite().positive().max(1_000_000),
  recipient: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/),
})

// GET /api/onramp/quote
export async function GET() {
  if (!ONRAMP_ENABLED) {
    return NextResponse.json(
      { error: "Crosschain onramp is temporarily disabled." },
      { status: 503 }
    )
  }

  try {
    const chains = await fetchSupportedOnrampChains()
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
  if (!ONRAMP_ENABLED) {
    return NextResponse.json(
      { error: "Crosschain onramp is temporarily disabled." },
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
