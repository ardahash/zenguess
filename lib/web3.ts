import { QueryClient } from "@tanstack/react-query"
import { createConfig, createStorage, http } from "wagmi"
import { injected, mock, walletConnect } from "wagmi/connectors"
import { cookieStorage } from "wagmi"
import { defaultChain, horizenMainnet, horizenTestnet, supportedChains } from "./chains"
import { clientEnv } from "./env/client"

const connectors = [
  ...(clientEnv.NEXT_PUBLIC_ENABLE_MOCK_WALLET
    ? [
        mock({
          accounts: [
            "0x1000000000000000000000000000000000000001",
          ] as [`0x${string}`, ...`0x${string}`[]],
          features: {
            reconnect: true,
          },
        }),
      ]
    : []),
  injected({ shimDisconnect: true }),
  ...(clientEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
    ? [
        walletConnect({
          projectId: clientEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
          showQrModal: true,
        }),
      ]
    : []),
]

export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors,
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: {
    [horizenMainnet.id]: http(horizenMainnet.rpcUrls.default.http[0]),
    [horizenTestnet.id]: http(horizenTestnet.rpcUrls.default.http[0]),
  },
})

export const queryClient = new QueryClient()

export function isWrongNetwork(chainId?: number): boolean {
  if (!chainId) {
    return false
  }
  return !supportedChains.some((chain) => chain.id === chainId)
}

export async function switchToDefaultNetwork(
  switchChainAsync?: (variables: { chainId: number }) => Promise<unknown>
): Promise<boolean> {
  if (!switchChainAsync) {
    return false
  }

  await switchChainAsync({ chainId: defaultChain.id })
  return true
}
