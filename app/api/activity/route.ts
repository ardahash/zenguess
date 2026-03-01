import { NextResponse } from "next/server"
import { z } from "zod"
import { clientEnv } from "@/lib/env/client"
import { fetchOnchainActivity } from "@/lib/onchain/indexer"
import { marketRepository } from "@/services/markets"

export const dynamic = "force-dynamic"

const activityQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
})

// GET /api/activity
export async function GET(request: Request) {
  const url = new URL(request.url)
  const parsedQuery = activityQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
  })

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsedQuery.error.flatten() },
      { status: 400 }
    )
  }

  const activity =
    clientEnv.NEXT_PUBLIC_GATEWAY_MODE === "onchain"
      ? await fetchOnchainActivity(parsedQuery.data.limit ?? 100)
      : marketRepository.listActivity(parsedQuery.data.limit ?? 100)
  return NextResponse.json(
    {
      data: activity,
      meta: {
        total: activity.length,
        fetchedAt: new Date().toISOString(),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
