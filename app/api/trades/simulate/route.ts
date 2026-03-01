import { NextResponse } from "next/server"
import { z } from "zod"
import { marketGateway } from "@/lib/gateways"

export const dynamic = "force-dynamic"

const simulateTradeSchema = z.object({
  marketId: z.string().trim().min(1).max(128),
  outcomeIndex: z.number().int().nonnegative().max(32),
  amount: z.number().finite().positive().max(1_000_000_000),
  side: z.enum(["buy", "sell"]),
})

// POST /api/trades/simulate
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsedBody = simulateTradeSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: "Invalid trade simulation payload",
        details: parsedBody.error.flatten(),
      },
      { status: 400 }
    )
  }

  try {
    const simulation = await marketGateway.simulateTrade(parsedBody.data)
    return NextResponse.json(
      { data: simulation },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to simulate trade.",
      },
      { status: 400 }
    )
  }
}
