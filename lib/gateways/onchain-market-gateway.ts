import type {
  CreateMarketInput,
  ListMarketsFilters,
  MarketEntity,
} from "@/services/markets"
import type {
  ClaimWinningsOutput,
  MarketGateway,
  ResolveMarketInput,
  SimulateTradeInput,
  SimulateTradeOutput,
  SubmitTradeInput,
  SubmitTradeOutput,
} from "./market-gateway"

export class OnchainMarketGateway implements MarketGateway {
  // TODO: Wire viem public/wallet clients + contract calls for each method.
  async listMarkets(filters: ListMarketsFilters = {}): Promise<MarketEntity[]> {
    void filters
    throw new Error("OnchainMarketGateway not implemented yet.")
  }

  async getMarket(marketId: string): Promise<MarketEntity | null> {
    void marketId
    throw new Error("OnchainMarketGateway not implemented yet.")
  }

  async simulateTrade(input: SimulateTradeInput): Promise<SimulateTradeOutput> {
    void input
    throw new Error("OnchainMarketGateway not implemented yet.")
  }

  async submitTrade(input: SubmitTradeInput): Promise<SubmitTradeOutput> {
    void input
    throw new Error("OnchainMarketGateway not implemented yet.")
  }

  async createMarket(input: CreateMarketInput): Promise<MarketEntity> {
    void input
    throw new Error("OnchainMarketGateway not implemented yet.")
  }

  async resolveMarket(input: ResolveMarketInput): Promise<MarketEntity | null> {
    void input
    throw new Error("OnchainMarketGateway not implemented yet.")
  }

  async claimWinnings(
    marketId: string,
    account: string
  ): Promise<ClaimWinningsOutput> {
    void marketId
    void account
    throw new Error("OnchainMarketGateway not implemented yet.")
  }
}
