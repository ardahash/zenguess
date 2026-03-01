import { NextResponse } from "next/server"
import { z } from "zod"
import { marketRepository } from "@/services/markets"

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

  const activity = marketRepository.listActivity(parsedQuery.data.limit ?? 100)
  return NextResponse.json({
    data: activity,
    meta: {
      total: activity.length,
      fetchedAt: new Date().toISOString(),
    },
  })
}
