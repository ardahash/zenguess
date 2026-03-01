import { NextResponse } from "next/server"
import { marketGateway } from "@/lib/gateways"
import { clientEnv } from "@/lib/env/client"
import { fetchOnchainTradesByMarket } from "@/lib/onchain/indexer"
import { marketRepository } from "@/services/markets"

export const dynamic = "force-dynamic"

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

  const trades =
    clientEnv.NEXT_PUBLIC_GATEWAY_MODE === "onchain"
      ? await fetchOnchainTradesByMarket(market.id)
      : marketRepository.listTradesByMarket(market.id)
  return NextResponse.json(
    {
      data: market,
      related: {
        trades,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
