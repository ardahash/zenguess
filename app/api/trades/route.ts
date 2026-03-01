import { NextResponse } from "next/server"
import { z } from "zod"
import { marketGateway } from "@/lib/gateways"

export const dynamic = "force-dynamic"

const submitTradeSchema = z.object({
  marketId: z.string().trim().min(1).max(128),
  outcomeIndex: z.number().int().nonnegative().max(32),
  amount: z.number().finite().positive().max(1_000_000_000),
  side: z.enum(["buy", "sell"]),
  slippage: z.number().finite().min(0).max(1),
  traderAddress: z.string().trim().min(10).max(128).optional(),
})

// POST /api/trades
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsedBody = submitTradeSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: "Invalid trade payload",
        details: parsedBody.error.flatten(),
      },
      { status: 400 }
    )
  }

  try {
    const result = await marketGateway.submitTrade(parsedBody.data)
    return NextResponse.json(
      { data: result },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to submit trade.",
      },
      { status: 400 }
    )
  }
}
