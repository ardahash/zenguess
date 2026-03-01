# Contracts Deployment Guide

## Prerequisites

1. Ensure `.env` contains:
   - `DEPLOYER_PRIVATE_KEY`
   - `HORIZEN_TESTNET_RPC_HTTP` or `HORIZEN_MAINNET_RPC_HTTP`
2. Optional overrides:
   - `COLLATERAL_TOKEN_ADDRESS`
   - `RESOLVER_ADDRESS`
   - `DEPLOY_OWNER_ADDRESS`
   - `TRADING_FEE_BPS` (default `200`)

If `COLLATERAL_TOKEN_ADDRESS` is empty, deployment script will deploy `MockCollateral`.

## Compile + Test

```bash
npm run contracts:compile
npm run contracts:test
```

## Deploy

Testnet:

```bash
npm run contracts:deploy:testnet
```

Mainnet:

```bash
npm run contracts:deploy:mainnet
```

Deployment records are written to `deployments/<network>.json`.

## Latest Deployments (March 1, 2026)

- Testnet:
  - `MockCollateral`: `0x6B518E35d352EDbdB68839445839f5a254eDBa71`
  - `ZenGuessMarketManager`: `0xFe89369Fc2A2013D65dfe4C6Cf953b15e5175B59`
  - Record: [deployments/horizenTestnet.json](/c:/Users/Arda/othergithubstuff/zenguess/deployments/horizenTestnet.json)
- Mainnet:
  - `Bridged USDC (Stargate) (USDC.e)`: `0xDF7108f8B10F9b9eC1aba01CCa057268cbf86B6c`
  - `ZenGuessMarketManager`: `0x8AbEdc4f49EeffC225948784E474d2280bF55E94`
  - Record: [deployments/horizenMainnet.json](/c:/Users/Arda/othergithubstuff/zenguess/deployments/horizenMainnet.json)

## Frontend Integration After Deploy

1. Copy deployed addresses into `lib/contracts.ts`.
2. Replace placeholder ABI fragments with final ABI.
3. Set `NEXT_PUBLIC_GATEWAY_MODE=onchain`.
4. Restart app and verify end-to-end trade/create/resolve/claim flows.
