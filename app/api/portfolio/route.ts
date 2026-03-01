import { NextResponse } from "next/server"
import { z } from "zod"
import { marketRepository } from "@/services/markets"

const portfolioQuerySchema = z.object({
  address: z.string().trim().min(10).max(128),
})

// GET /api/portfolio?address=
export async function GET(request: Request) {
  const url = new URL(request.url)
  const parsedQuery = portfolioQuerySchema.safeParse({
    address: url.searchParams.get("address"),
  })

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: "Missing or invalid address query parameter",
        details: parsedQuery.error.flatten(),
      },
      { status: 400 }
    )
  }

  const positions = marketRepository.getPortfolio(parsedQuery.data.address)
  return NextResponse.json({
    data: positions,
    meta: {
      total: positions.length,
      fetchedAt: new Date().toISOString(),
    },
  })
}
