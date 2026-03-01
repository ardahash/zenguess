import { NextResponse } from "next/server"
import { z } from "zod"
import { marketGateway } from "@/lib/gateways"
import type { MarketCategory, MarketStatus } from "@/services/markets"

const listMarketsQuerySchema = z.object({
  category: z
    .enum([
      "all",
      "crypto",
      "politics",
      "sports",
      "science",
      "culture",
      "economics",
      "other",
    ])
    .optional(),
  status: z.enum(["all", "open", "closed", "resolved"]).optional(),
  sort: z.enum(["volume", "newest", "ending_soon", "liquidity"]).optional(),
  q: z.string().trim().max(128).optional(),
})

const createMarketSchema = z.object({
  question: z.string().trim().min(10).max(280),
  description: z.string().trim().max(5000).default(""),
  category: z.enum([
    "crypto",
    "politics",
    "sports",
    "science",
    "culture",
    "economics",
    "other",
  ]),
  endTime: z.string().datetime(),
  outcomes: z.array(z.string().trim().min(1).max(64)).min(2).max(8),
  initialLiquidity: z.number().finite().positive().max(1_000_000_000),
  resolutionSource: z.string().trim().min(3).max(500),
  creatorAddress: z.string().trim().min(10).max(128).optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(16).optional(),
})

// GET /api/markets
export async function GET(request: Request) {
  const url = new URL(request.url)
  const parsedQuery = listMarketsQuerySchema.safeParse({
    category: url.searchParams.get("category") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  })

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: parsedQuery.error.flatten(),
      },
      { status: 400 }
    )
  }

  const filters = parsedQuery.data
  const markets = await marketGateway.listMarkets({
    category: filters.category as MarketCategory | "all" | undefined,
    status: filters.status as MarketStatus | "all" | undefined,
    sort: filters.sort,
    query: filters.q,
  })

  return NextResponse.json({
    data: markets,
    meta: {
      total: markets.length,
      fetchedAt: new Date().toISOString(),
    },
  })
}

// POST /api/markets
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsedBody = createMarketSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: "Invalid market payload",
        details: parsedBody.error.flatten(),
      },
      { status: 400 }
    )
  }

  const payload = parsedBody.data
  const market = await marketGateway.createMarket({
    question: payload.question,
    description: payload.description,
    category: payload.category,
    endTime: payload.endTime,
    outcomes: payload.outcomes,
    initialLiquidity: payload.initialLiquidity,
    resolutionSource: payload.resolutionSource,
    creatorAddress:
      payload.creatorAddress ?? "0x1000000000000000000000000000000000000001",
    tags: payload.tags ?? [],
  })

  return NextResponse.json({ data: market }, { status: 201 })
}
