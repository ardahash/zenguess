import { MockMarketGateway } from "./mock-market-gateway"
import { OnchainMarketGateway } from "./onchain-market-gateway"
import type { MarketGateway } from "./market-gateway"
import { clientEnv } from "@/lib/env/client"

export const marketGateway: MarketGateway =
  clientEnv.NEXT_PUBLIC_GATEWAY_MODE === "onchain"
    ? new OnchainMarketGateway()
    : new MockMarketGateway()

export * from "./market-gateway"
