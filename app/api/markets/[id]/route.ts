import { NextResponse } from "next/server"
import { marketGateway } from "@/lib/gateways"
import { marketRepository } from "@/services/markets"

interface Params {
  params: {
    id: string
  }
}

// GET /api/markets/:id
export async function GET(_request: Request, { params }: Params) {
  const market = await marketGateway.getMarket(params.id)

  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 })
  }

  const trades = marketRepository.listTradesByMarket(market.id)
  return NextResponse.json({
    data: market,
    related: {
      trades,
    },
  })
}
