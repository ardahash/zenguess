# ZenGuess

Production-ready Next.js prediction market frontend for Horizen L3 with contract placeholders and a mock gateway for development.

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
- `HORIZEN_TESTNET_RPC_HTTP` and/or `HORIZEN_MAINNET_RPC_HTTP`
- optionally `COLLATERAL_TOKEN_ADDRESS`, `RESOLVER_ADDRESS`, `DEPLOY_OWNER_ADDRESS`, `TRADING_FEE_BPS`

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
  - `GET /api/markets/:id`
  - `GET /api/activity`
  - `GET /api/portfolio?address=`

Swapping from mock to on-chain is a gateway switch, not a UI rewrite.

## Contract Status

The repo now contains a production-grade draft contract implementation and deploy/test pipeline.

- Contracts are drafted and tested locally.
- Testnet deployment executed on March 1, 2026:
  - `MockCollateral`: `0x6B518E35d352EDbdB68839445839f5a254eDBa71`
  - `ZenGuessMarketManager`: `0xFe89369Fc2A2013D65dfe4C6Cf953b15e5175B59`
  - Deployment record: [deployments/horizenTestnet.json](/c:/Users/Arda/othergithubstuff/zenguess/deployments/horizenTestnet.json)
- Mainnet deployment executed on March 1, 2026:
  - `Bridged USDC (Stargate) (USDC.e)`: `0xDF7108f8B10F9b9eC1aba01CCa057268cbf86B6c`
  - `ZenGuessMarketManager`: `0x8AbEdc4f49EeffC225948784E474d2280bF55E94`
  - Deployment record: [deployments/horizenMainnet.json](/c:/Users/Arda/othergithubstuff/zenguess/deployments/horizenMainnet.json)
- Frontend remains on `MockMarketGateway` by default (`NEXT_PUBLIC_GATEWAY_MODE=mock`).
- Switch to on-chain gateway after deployment by setting `NEXT_PUBLIC_GATEWAY_MODE=onchain` and wiring ABI/address in `lib/contracts.ts`.
