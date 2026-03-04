# ZenGuess

Production-ready Next.js prediction market frontend for Horizen L3 with on-chain reads/indexing and wallet-signed writes.

## Stack

- Next.js 14 App Router + TypeScript strict mode
- `wagmi` + `viem` for wallet/network plumbing
- In-memory repository + API routes shaped for indexer/subgraph migration
- Tailwind + shadcn/ui
- Vitest unit tests + Playwright smoke e2e + GitHub Actions CI

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev`: start local dev server
- `npm run build`: production build
- `npm run start`: run production server
- `npm run lint`: ESLint
- `npm run typecheck`: strict TypeScript checks
- `npm run test:unit`: Vitest unit suite
- `npm run test:e2e`: Playwright smoke tests
- `npm run format`: Prettier write
- `npm run format:check`: Prettier check
- `npm run contracts:compile`: compile Solidity contracts
- `npm run contracts:test`: run Solidity tests (Hardhat)
- `npm run contracts:deploy:testnet`: deploy contracts to Horizen testnet
- `npm run contracts:deploy:mainnet`: deploy contracts to Horizen mainnet

## Environment

All runtime variables are documented in [.env.example](/c:/Users/Arda/othergithubstuff/zenguess/.env.example).  
Validation is enforced via `zod` in:

- [lib/env/client.ts](/c:/Users/Arda/othergithubstuff/zenguess/lib/env/client.ts)
- [lib/env/server.ts](/c:/Users/Arda/othergithubstuff/zenguess/lib/env/server.ts)

The app fails fast on invalid/missing env values.

Contract deployment requires:

- `DEPLOYER_PRIVATE_KEY`
- `LAYERZERO_API_KEY` (for `/onramp` quote API)
- `HORIZEN_TESTNET_RPC_HTTP` and/or `HORIZEN_MAINNET_RPC_HTTP`
- optionally `COLLATERAL_TOKEN_ADDRESS`, `RESOLVER_ADDRESS`, `DEPLOY_OWNER_ADDRESS`, `TRADING_FEE_BPS`
- optionally `DEPLOYMENT_LABEL` to keep multiple deployment records (e.g. `horizenMainnet-usdce.json`)

## Architecture

- Contract wiring placeholders:
  - [lib/contracts.ts](/c:/Users/Arda/othergithubstuff/zenguess/lib/contracts.ts)
  - TODO markers for final ABI/address paste
- Solidity contracts + deployment:
  - [contracts/ZenGuessMarketManager.sol](/c:/Users/Arda/othergithubstuff/zenguess/contracts/ZenGuessMarketManager.sol)
  - [contracts/mocks/MockCollateral.sol](/c:/Users/Arda/othergithubstuff/zenguess/contracts/mocks/MockCollateral.sol)
  - [scripts/deploy/deploy-market-manager.js](/c:/Users/Arda/othergithubstuff/zenguess/scripts/deploy/deploy-market-manager.js)
  - [hardhat.config.js](/c:/Users/Arda/othergithubstuff/zenguess/hardhat.config.js)
- Gateway abstraction:
  - [lib/gateways/market-gateway.ts](/c:/Users/Arda/othergithubstuff/zenguess/lib/gateways/market-gateway.ts)
  - [lib/gateways/mock-market-gateway.ts](/c:/Users/Arda/othergithubstuff/zenguess/lib/gateways/mock-market-gateway.ts)
  - [lib/gateways/onchain-market-gateway.ts](/c:/Users/Arda/othergithubstuff/zenguess/lib/gateways/onchain-market-gateway.ts)
- Data layer:
  - [services/markets/market.repository.ts](/c:/Users/Arda/othergithubstuff/zenguess/services/markets/market.repository.ts)
  - [services/markets/market.types.ts](/c:/Users/Arda/othergithubstuff/zenguess/services/markets/market.types.ts)
  - [services/markets/market.status.ts](/c:/Users/Arda/othergithubstuff/zenguess/services/markets/market.status.ts)
- API routes:
  - `GET /api/markets`
  - `POST /api/markets` (mock mode only)
  - `GET /api/markets/:id`
  - `GET /api/activity`
  - `GET /api/portfolio?address=`
  - `POST /api/trades/simulate`
  - `POST /api/trades` (mock mode only)
  - `GET /api/onramp/quote`
  - `POST /api/onramp/quote`

Gateway mode is controlled by `NEXT_PUBLIC_GATEWAY_MODE` (`onchain` or `mock`).
Collateral mode is controlled by `NEXT_PUBLIC_COLLATERAL_MODE` (`usdce` or `eth`).
Current default is `onchain` + `usdce` collateral.

## Contract Status

The repo now contains a production-grade draft contract implementation and deploy/test pipeline.

- Contracts are drafted and tested locally.
- Mainnet ETH/WETH deployment executed on March 2, 2026 (legacy/internal testing):
  - `WETH`: `0x4200000000000000000000000000000000000006`
  - `ZenGuessMarketManager`: `0xE3dB30ff10E851aA1f3e50Ed212281CB5e98a9E8`
  - Deployment record: [deployments/horizenMainnet.json](/c:/Users/Arda/othergithubstuff/zenguess/deployments/horizenMainnet.json)
- Mainnet USDC.e deployment executed on March 3, 2026 (production default):
  - `USDC.e`: `0xDF7108f8B10F9b9eC1aba01CCa057268cbf86B6c`
  - `ZenGuessMarketManager`: `0x770fc931e07A6Df2f5F0Aa481a7c6AeC45286Ea7`
  - Deployment record: [deployments/horizenMainnet-usdce.json](/c:/Users/Arda/othergithubstuff/zenguess/deployments/horizenMainnet-usdce.json)
- Testnet WETH deployment executed on March 2, 2026:
  - `WETH`: `0x4200000000000000000000000000000000000006`
  - `ZenGuessMarketManager`: `0xba7147BCE0e12414e7612Ab72D386FeBAdB3322D`
  - Deployment record: [deployments/horizenTestnet.json](/c:/Users/Arda/othergithubstuff/zenguess/deployments/horizenTestnet.json)
- Frontend defaults to on-chain mode with USDC.e collateral (`NEXT_PUBLIC_GATEWAY_MODE=onchain`, `NEXT_PUBLIC_COLLATERAL_MODE=usdce`).
