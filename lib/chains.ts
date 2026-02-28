// Horizen L3 chain definitions
// OP Stack L3 on Base

export interface ChainConfig {
  chainId: number
  name: string
  network: "mainnet" | "testnet"
  rpcHttp: string
  rpcWs: string
  explorerUrl: string
  bridgeUrl?: string
  faucetUrl?: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

export const horizenMainnet: ChainConfig = {
  chainId: 26514,
  name: "Horizen Mainnet",
  network: "mainnet",
  rpcHttp:
    process.env.NEXT_PUBLIC_HORIZEN_RPC_HTTP ||
    "https://horizen.calderachain.xyz/http",
  rpcWs:
    process.env.NEXT_PUBLIC_HORIZEN_RPC_WS ||
    "wss://horizen.calderachain.xyz/ws",
  explorerUrl:
    process.env.NEXT_PUBLIC_EXPLORER_URL ||
    "https://horizen.calderaexplorer.xyz/",
  bridgeUrl:
    process.env.NEXT_PUBLIC_BRIDGE_URL || "https://horizen.hub.caldera.xyz/",
  nativeCurrency: {
    name: "ZEN",
    symbol: "ZEN",
    decimals: 18,
  },
}

export const horizenTestnet: ChainConfig = {
  chainId: 2651420,
  name: "Horizen Testnet",
  network: "testnet",
  rpcHttp:
    process.env.NEXT_PUBLIC_HORIZEN_RPC_HTTP ||
    "https://horizen-testnet.rpc.caldera.xyz/http",
  rpcWs:
    process.env.NEXT_PUBLIC_HORIZEN_RPC_WS ||
    "wss://horizen-testnet.rpc.caldera.xyz/ws",
  explorerUrl:
    process.env.NEXT_PUBLIC_EXPLORER_URL ||
    "https://horizen-testnet.explorer.caldera.xyz/",
  faucetUrl: "https://horizen-testnet.hub.caldera.xyz/",
  nativeCurrency: {
    name: "ZEN",
    symbol: "ZEN",
    decimals: 18,
  },
}

const defaultNetwork =
  (process.env.NEXT_PUBLIC_DEFAULT_CHAIN as "mainnet" | "testnet") || "testnet"

export const defaultChain: ChainConfig =
  defaultNetwork === "mainnet" ? horizenMainnet : horizenTestnet

export function getChain(network: "mainnet" | "testnet"): ChainConfig {
  return network === "mainnet" ? horizenMainnet : horizenTestnet
}

export function getExplorerTxUrl(txHash: string, chain?: ChainConfig): string {
  const c = chain || defaultChain
  return `${c.explorerUrl}tx/${txHash}`
}

export function getExplorerAddressUrl(
  address: string,
  chain?: ChainConfig
): string {
  const c = chain || defaultChain
  return `${c.explorerUrl}address/${address}`
}
