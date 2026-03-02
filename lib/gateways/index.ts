import { clientEnv } from "@/lib/env/client"
import type {
  ClaimWinningsOutput,
  MarketGateway,
  ResolveMarketInput,
  SimulateTradeInput,
  SimulateTradeOutput,
  SubmitTradeInput,
  SubmitTradeOutput,
} from "./market-gateway"
import type {
  CreateMarketInput,
  ListMarketsFilters,
  MarketEntity,
} from "@/services/markets/market.types"

class LazyMarketGateway implements MarketGateway {
  private gatewayPromise: Promise<MarketGateway> | null = null

  private getGateway(): Promise<MarketGateway> {
    if (this.gatewayPromise) {
      return this.gatewayPromise
    }

    this.gatewayPromise = (async () => {
      if (clientEnv.NEXT_PUBLIC_GATEWAY_MODE === "onchain") {
        const { OnchainMarketGateway } = await import("./onchain-market-gateway")
        return new OnchainMarketGateway()
      }

      const { MockMarketGateway } = await import("./mock-market-gateway")
      return new MockMarketGateway()
    })()

    return this.gatewayPromise
  }

  async listMarkets(filters?: ListMarketsFilters): Promise<MarketEntity[]> {
    const gateway = await this.getGateway()
    return gateway.listMarkets(filters)
  }

  async getMarket(marketId: string): Promise<MarketEntity | null> {
    const gateway = await this.getGateway()
    return gateway.getMarket(marketId)
  }

  async simulateTrade(input: SimulateTradeInput): Promise<SimulateTradeOutput> {
    const gateway = await this.getGateway()
    return gateway.simulateTrade(input)
  }

  async submitTrade(input: SubmitTradeInput): Promise<SubmitTradeOutput> {
    const gateway = await this.getGateway()
    return gateway.submitTrade(input)
  }

  async createMarket(input: CreateMarketInput): Promise<MarketEntity> {
    const gateway = await this.getGateway()
    return gateway.createMarket(input)
  }

  async resolveMarket(input: ResolveMarketInput): Promise<MarketEntity | null> {
    const gateway = await this.getGateway()
    return gateway.resolveMarket(input)
  }

  async claimWinnings(
    marketId: string,
    account: string
  ): Promise<ClaimWinningsOutput> {
    const gateway = await this.getGateway()
    return gateway.claimWinnings(marketId, account)
  }
}

export const marketGateway: MarketGateway = new LazyMarketGateway()

export * from "./market-gateway"
