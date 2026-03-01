import { createPublicClient, http, type PublicClient } from "viem"
import { defaultChain } from "@/lib/chains"

let publicClientSingleton: PublicClient | null = null

export function getOnchainPublicClient(): PublicClient {
  if (publicClientSingleton) {
    return publicClientSingleton
  }

  publicClientSingleton = createPublicClient({
    chain: defaultChain,
    transport: http(defaultChain.rpcUrls.default.http[0]),
  })

  return publicClientSingleton
}
