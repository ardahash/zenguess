import type {
  CreateMarketInput,
  ListMarketsFilters,
  MarketEntity,
} from "@/services/markets"
import {
  fetchOnchainMarketById,
  fetchOnchainMarkets,
  fetchOnchainTradeSimulation,
} from "@/lib/onchain/indexer"
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
  async listMarkets(filters: ListMarketsFilters = {}): Promise<MarketEntity[]> {
    return fetchOnchainMarkets(filters)
  }

  async getMarket(marketId: string): Promise<MarketEntity | null> {
    return fetchOnchainMarketById(marketId)
  }

  async simulateTrade(input: SimulateTradeInput): Promise<SimulateTradeOutput> {
    return fetchOnchainTradeSimulation(input)
  }

  async submitTrade(input: SubmitTradeInput): Promise<SubmitTradeOutput> {
    void input
    throw new Error(
      "On-chain trades must be signed from a connected wallet in the client."
    )
  }

  async createMarket(input: CreateMarketInput): Promise<MarketEntity> {
    void input
    throw new Error(
      "On-chain market creation must be signed from a connected wallet in the client."
    )
  }

  async resolveMarket(input: ResolveMarketInput): Promise<MarketEntity | null> {
    void input
    throw new Error(
      "On-chain market resolution must be signed from a connected wallet in the client."
    )
  }

  async claimWinnings(
    marketId: string,
    account: string
  ): Promise<ClaimWinningsOutput> {
    void marketId
    void account
    throw new Error(
      "Claiming winnings must be signed from a connected wallet in the client."
    )
  }
}
