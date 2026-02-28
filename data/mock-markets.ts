import type {
  Market,
  Trade,
  ActivityEvent,
  UserPosition,
} from "./types"

// ---- Mock Markets ----
export const mockMarkets: Market[] = [
  {
    id: "market_1",
    question: "Will Bitcoin exceed $150,000 by end of 2026?",
    description:
      "This market resolves YES if the price of Bitcoin (BTC/USD) on CoinGecko exceeds $150,000 at any point before December 31, 2026 23:59 UTC.",
    category: "crypto",
    status: "open",
    outcomes: [
      { label: "Yes", probability: 0.62 },
      { label: "No", probability: 0.38 },
    ],
    endTime: new Date("2026-12-31T23:59:00Z"),
    createdAt: new Date("2026-01-15T10:00:00Z"),
    volume: 2_450_000,
    liquidity: 890_000,
    resolutionSource: "CoinGecko BTC/USD price feed",
    tags: ["bitcoin", "price", "2026"],
    creatorAddress: "0x1234567890abcdef1234567890abcdef12345678",
  },
  {
    id: "market_2",
    question: "Will Ethereum transition to full danksharding in 2026?",
    description:
      "Resolves YES if Ethereum mainnet activates full danksharding (not proto-danksharding) before December 31, 2026.",
    category: "crypto",
    status: "open",
    outcomes: [
      { label: "Yes", probability: 0.24 },
      { label: "No", probability: 0.76 },
    ],
    endTime: new Date("2026-12-31T23:59:00Z"),
    createdAt: new Date("2026-02-01T14:30:00Z"),
    volume: 1_120_000,
    liquidity: 450_000,
    resolutionSource: "Ethereum Foundation announcements",
    tags: ["ethereum", "danksharding", "scaling"],
    creatorAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  },
  {
    id: "market_3",
    question: "Will the US pass a comprehensive crypto regulation bill by Q3 2026?",
    description:
      "Resolves YES if the US Congress passes and the President signs a comprehensive cryptocurrency regulation bill by September 30, 2026.",
    category: "politics",
    status: "open",
    outcomes: [
      { label: "Yes", probability: 0.45 },
      { label: "No", probability: 0.55 },
    ],
    endTime: new Date("2026-09-30T23:59:00Z"),
    createdAt: new Date("2026-01-20T09:00:00Z"),
    volume: 3_200_000,
    liquidity: 1_200_000,
    resolutionSource: "Congress.gov official records",
    tags: ["regulation", "usa", "policy"],
    creatorAddress: "0x9876543210fedcba9876543210fedcba98765432",
  },
  {
    id: "market_4",
    question: "Will SpaceX successfully land Starship on Mars by 2030?",
    description:
      "Resolves YES if SpaceX successfully lands a Starship vehicle on the surface of Mars before January 1, 2030.",
    category: "science",
    status: "open",
    outcomes: [
      { label: "Yes", probability: 0.08 },
      { label: "No", probability: 0.92 },
    ],
    endTime: new Date("2029-12-31T23:59:00Z"),
    createdAt: new Date("2026-01-10T12:00:00Z"),
    volume: 890_000,
    liquidity: 340_000,
    resolutionSource: "SpaceX official communications / NASA confirmation",
    tags: ["spacex", "mars", "space"],
    creatorAddress: "0x1111222233334444555566667777888899990000",
  },
  {
    id: "market_5",
    question: "Will the next FIFA World Cup winner be a South American team?",
    description:
      "Resolves YES if a South American national team wins the 2026 FIFA World Cup.",
    category: "sports",
    status: "open",
    outcomes: [
      { label: "Yes", probability: 0.41 },
      { label: "No", probability: 0.59 },
    ],
    endTime: new Date("2026-07-19T23:59:00Z"),
    createdAt: new Date("2026-02-05T08:00:00Z"),
    volume: 5_600_000,
    liquidity: 2_100_000,
    resolutionSource: "FIFA official results",
    tags: ["fifa", "world cup", "soccer"],
    creatorAddress: "0xaaaabbbbccccddddeeeeffffaaaabbbbccccdddd",
  },
  {
    id: "market_6",
    question: "Will global AI chip revenue surpass $200B in 2026?",
    description:
      "Resolves YES if total worldwide revenue from AI-specific chips (GPUs, TPUs, NPUs) exceeds $200 billion in calendar year 2026.",
    category: "economics",
    status: "open",
    outcomes: [
      { label: "Yes", probability: 0.71 },
      { label: "No", probability: 0.29 },
    ],
    endTime: new Date("2027-03-31T23:59:00Z"),
    createdAt: new Date("2026-02-10T16:00:00Z"),
    volume: 1_800_000,
    liquidity: 720_000,
    resolutionSource: "Gartner / IDC annual report",
    tags: ["ai", "chips", "revenue"],
    creatorAddress: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  },
  {
    id: "market_7",
    question: "Will a new Taylor Swift album be released in 2026?",
    description:
      "Resolves YES if Taylor Swift releases a new studio album (not a re-recording) before December 31, 2026.",
    category: "culture",
    status: "open",
    outcomes: [
      { label: "Yes", probability: 0.55 },
      { label: "No", probability: 0.45 },
    ],
    endTime: new Date("2026-12-31T23:59:00Z"),
    createdAt: new Date("2026-02-14T10:00:00Z"),
    volume: 420_000,
    liquidity: 180_000,
    resolutionSource: "Official music release platforms (Spotify, Apple Music)",
    tags: ["music", "taylor swift", "entertainment"],
    creatorAddress: "0xfeedface0feedface0feedface0feedface0feed",
  },
  {
    id: "market_8",
    question: "Will Solana flip Ethereum in daily transaction count in Q2 2026?",
    description:
      "Resolves YES if Solana's daily transaction count exceeds Ethereum's (mainnet only) for at least 30 consecutive days in Q2 2026.",
    category: "crypto",
    status: "resolved",
    outcomes: [
      { label: "Yes", probability: 1.0 },
      { label: "No", probability: 0.0 },
    ],
    endTime: new Date("2026-06-30T23:59:00Z"),
    createdAt: new Date("2026-01-05T09:00:00Z"),
    volume: 4_200_000,
    liquidity: 0,
    resolvedOutcome: 0,
    resolutionSource: "Dune Analytics dashboard",
    tags: ["solana", "ethereum", "transactions"],
    creatorAddress: "0xbadcafe0badcafe0badcafe0badcafe0badcafe0b",
  },
]

// ---- Mock Price History ----
export function generatePriceHistory(
  startProb: number,
  endProb: number,
  days: number
): Array<{ date: string; yes: number; no: number }> {
  const data: Array<{ date: string; yes: number; no: number }> = []
  const now = new Date()
  for (let i = days; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const progress = (days - i) / days
    const base = startProb + (endProb - startProb) * progress
    const noise = (Math.random() - 0.5) * 0.08
    const yes = Math.max(0.01, Math.min(0.99, base + noise))
    data.push({
      date: date.toISOString().split("T")[0],
      yes: Math.round(yes * 100),
      no: Math.round((1 - yes) * 100),
    })
  }
  return data
}

// ---- Mock Trades ----
export const mockTrades: Trade[] = [
  {
    id: "trade_1",
    marketId: "market_1",
    traderAddress: "0xuser1111user1111user1111user1111user1111",
    outcomeIndex: 0,
    outcomeLabel: "Yes",
    side: "buy",
    shares: 500,
    price: 0.62,
    total: 310,
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    txHash: "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1",
  },
  {
    id: "trade_2",
    marketId: "market_1",
    traderAddress: "0xuser2222user2222user2222user2222user2222",
    outcomeIndex: 1,
    outcomeLabel: "No",
    side: "buy",
    shares: 200,
    price: 0.38,
    total: 76,
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    txHash: "0xdef789abc012def789abc012def789abc012def789abc012def789abc012def7",
  },
  {
    id: "trade_3",
    marketId: "market_1",
    traderAddress: "0xuser3333user3333user3333user3333user3333",
    outcomeIndex: 0,
    outcomeLabel: "Yes",
    side: "sell",
    shares: 100,
    price: 0.61,
    total: 61,
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    txHash: "0x111222333444555666777888999000aaabbbcccdddeeefff000111222333444",
  },
  {
    id: "trade_4",
    marketId: "market_3",
    traderAddress: "0xuser4444user4444user4444user4444user4444",
    outcomeIndex: 0,
    outcomeLabel: "Yes",
    side: "buy",
    shares: 1000,
    price: 0.45,
    total: 450,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    txHash: "0xfff000eee111ddd222ccc333bbb444aaa555999888777666555444333222111",
  },
  {
    id: "trade_5",
    marketId: "market_5",
    traderAddress: "0xuser5555user5555user5555user5555user5555",
    outcomeIndex: 0,
    outcomeLabel: "Yes",
    side: "buy",
    shares: 750,
    price: 0.41,
    total: 307.5,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    txHash: "0x999888777666555444333222111000fffeeecccbbbaaa999888777666555444",
  },
]

// ---- Mock Activity ----
export const mockActivity: ActivityEvent[] = [
  {
    id: "event_1",
    type: "trade",
    marketId: "market_1",
    marketTitle: "Will Bitcoin exceed $150,000 by end of 2026?",
    description: "Bought 500 YES shares at $0.62",
    actor: "0xuser1111user1111user1111user1111user1111",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    txHash: "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1",
  },
  {
    id: "event_2",
    type: "trade",
    marketId: "market_1",
    marketTitle: "Will Bitcoin exceed $150,000 by end of 2026?",
    description: "Bought 200 NO shares at $0.38",
    actor: "0xuser2222user2222user2222user2222user2222",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    txHash: "0xdef789abc012def789abc012def789abc012def789abc012def789abc012def7",
  },
  {
    id: "event_3",
    type: "market_created",
    marketId: "market_7",
    marketTitle: "Will a new Taylor Swift album be released in 2026?",
    description: "New market created with $180K initial liquidity",
    actor: "0xfeedface0feedface0feedface0feedface0feed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    txHash: "0x444333222111000fffeeecccbbbaaa999888777666555444333222111000fff",
  },
  {
    id: "event_4",
    type: "market_resolved",
    marketId: "market_8",
    marketTitle:
      "Will Solana flip Ethereum in daily transaction count in Q2 2026?",
    description: "Market resolved: YES",
    actor: "0xbadcafe0badcafe0badcafe0badcafe0badcafe0b",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    txHash: "0x000111222333444555666777888999aaabbbcccdddeeefff000111222333444",
  },
  {
    id: "event_5",
    type: "trade",
    marketId: "market_3",
    marketTitle:
      "Will the US pass a comprehensive crypto regulation bill by Q3 2026?",
    description: "Bought 1,000 YES shares at $0.45",
    actor: "0xuser4444user4444user4444user4444user4444",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    txHash: "0xfff000eee111ddd222ccc333bbb444aaa555999888777666555444333222111",
  },
  {
    id: "event_6",
    type: "liquidity_added",
    marketId: "market_5",
    marketTitle:
      "Will the next FIFA World Cup winner be a South American team?",
    description: "Added $50,000 liquidity",
    actor: "0xaaaabbbbccccddddeeeeffffaaaabbbbccccdddd",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
    txHash: "0xaaabbb000111ccc222ddd333eee444fff555666777888999aaabbb000111ccc",
  },
  {
    id: "event_7",
    type: "trade",
    marketId: "market_6",
    marketTitle: "Will global AI chip revenue surpass $200B in 2026?",
    description: "Bought 300 YES shares at $0.71",
    actor: "0xuser1111user1111user1111user1111user1111",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    txHash: "0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  },
  {
    id: "event_8",
    type: "trade",
    marketId: "market_5",
    marketTitle:
      "Will the next FIFA World Cup winner be a South American team?",
    description: "Bought 750 YES shares at $0.41",
    actor: "0xuser5555user5555user5555user5555user5555",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    txHash: "0x999888777666555444333222111000fffeeecccbbbaaa999888777666555444",
  },
]

// ---- Mock User Positions ----
export const mockPositions: UserPosition[] = [
  {
    marketId: "market_1",
    marketTitle: "Will Bitcoin exceed $150,000 by end of 2026?",
    outcome: "Yes",
    shares: 500,
    avgPrice: 0.55,
    currentPrice: 0.62,
    pnl: 35.0,
    status: "open",
  },
  {
    marketId: "market_3",
    marketTitle:
      "Will the US pass a comprehensive crypto regulation bill by Q3 2026?",
    outcome: "Yes",
    shares: 300,
    avgPrice: 0.4,
    currentPrice: 0.45,
    pnl: 15.0,
    status: "open",
  },
  {
    marketId: "market_5",
    marketTitle:
      "Will the next FIFA World Cup winner be a South American team?",
    outcome: "Yes",
    shares: 750,
    avgPrice: 0.38,
    currentPrice: 0.41,
    pnl: 22.5,
    status: "open",
  },
  {
    marketId: "market_8",
    marketTitle:
      "Will Solana flip Ethereum in daily transaction count in Q2 2026?",
    outcome: "Yes",
    shares: 200,
    avgPrice: 0.35,
    currentPrice: 1.0,
    pnl: 130.0,
    status: "resolved",
  },
]
