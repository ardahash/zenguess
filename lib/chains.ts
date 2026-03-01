import { defineChain, type Chain } from "viem"
import { clientEnv } from "@/lib/env/client"

export const horizenMainnet = defineChain({
  id: 26514,
  name: "Horizen Mainnet",
  network: "horizen-mainnet",
  nativeCurrency: {
    name: "ZEN",
    symbol: "ZEN",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [clientEnv.NEXT_PUBLIC_HORIZEN_MAINNET_RPC_HTTP],
      webSocket: [clientEnv.NEXT_PUBLIC_HORIZEN_MAINNET_RPC_WS],
    },
    public: {
      http: [clientEnv.NEXT_PUBLIC_HORIZEN_MAINNET_RPC_HTTP],
      webSocket: [clientEnv.NEXT_PUBLIC_HORIZEN_MAINNET_RPC_WS],
    },
  },
  blockExplorers: {
    default: {
      name: "Horizen Explorer",
      url: clientEnv.NEXT_PUBLIC_HORIZEN_MAINNET_EXPLORER_URL,
    },
  },
})

export const horizenTestnet = defineChain({
  id: 2651420,
  name: "Horizen Testnet",
  network: "horizen-testnet",
  nativeCurrency: {
    name: "ZEN",
    symbol: "ZEN",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [clientEnv.NEXT_PUBLIC_HORIZEN_TESTNET_RPC_HTTP],
      webSocket: [clientEnv.NEXT_PUBLIC_HORIZEN_TESTNET_RPC_WS],
    },
    public: {
      http: [clientEnv.NEXT_PUBLIC_HORIZEN_TESTNET_RPC_HTTP],
      webSocket: [clientEnv.NEXT_PUBLIC_HORIZEN_TESTNET_RPC_WS],
    },
  },
  blockExplorers: {
    default: {
      name: "Horizen Testnet Explorer",
      url: clientEnv.NEXT_PUBLIC_HORIZEN_TESTNET_EXPLORER_URL,
    },
  },
  testnet: true,
})

export const supportedChains = [horizenMainnet, horizenTestnet] as const

export const defaultChain =
  clientEnv.NEXT_PUBLIC_DEFAULT_CHAIN === "mainnet"
    ? horizenMainnet
    : horizenTestnet

export function isSupportedChain(chainId?: number): boolean {
  return supportedChains.some((chain) => chain.id === chainId)
}

export function getChainById(chainId: number): Chain | undefined {
  return supportedChains.find((chain) => chain.id === chainId)
}

export function getExplorerTxUrl(txHash: string, chain: Chain = defaultChain) {
  return `${chain.blockExplorers?.default.url}/tx/${txHash}`
}

export function getExplorerAddressUrl(
  address: string,
  chain: Chain = defaultChain
) {
  return `${chain.blockExplorers?.default.url}/address/${address}`
}
