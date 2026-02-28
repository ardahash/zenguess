import { NextResponse } from "next/server"
import { mockMarkets } from "@/data/mock-markets"

// GET /api/markets - List markets
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  const status = searchParams.get("status")
  const sort = searchParams.get("sort") || "volume"
  const search = searchParams.get("q")

  let markets = [...mockMarkets]

  // Filter by category
  if (category && category !== "all") {
    markets = markets.filter((m) => m.category === category)
  }

  // Filter by status
  if (status && status !== "all") {
    markets = markets.filter((m) => m.status === status)
  }

  // Search
  if (search) {
    const q = search.toLowerCase()
    markets = markets.filter(
      (m) =>
        m.question.toLowerCase().includes(q) ||
        m.tags.some((t) => t.includes(q))
    )
  }

  // Sort
  switch (sort) {
    case "volume":
      markets.sort((a, b) => b.volume - a.volume)
      break
    case "newest":
      markets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      break
    case "ending_soon":
      markets.sort((a, b) => a.endTime.getTime() - b.endTime.getTime())
      break
    case "liquidity":
      markets.sort((a, b) => b.liquidity - a.liquidity)
      break
  }

  return NextResponse.json({
    markets,
    total: markets.length,
  })
}

// POST /api/markets - Create a new market (placeholder)
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    const { question, category, endTime, outcomes, initialLiquidity } = body

    if (!question || !category || !endTime || !outcomes) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // TODO: Replace with actual smart contract call
    // This would call MarketFactory.createMarket() via the Horizen RPC
    const newMarket = {
      id: `market_${Date.now()}`,
      question,
      category,
      status: "open",
      outcomes: outcomes.map((label: string, i: number) => ({
        label,
        probability: 1 / outcomes.length,
      })),
      endTime: new Date(endTime),
      createdAt: new Date(),
      volume: 0,
      liquidity: initialLiquidity || 0,
      tags: body.tags || [],
      creatorAddress: "0x0000000000000000000000000000000000000000",
    }

    // In production, this would be persisted to the subgraph index
    return NextResponse.json({ market: newMarket }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }
}
