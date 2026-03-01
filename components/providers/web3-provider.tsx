"use client"

import type { ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"
import { queryClient, wagmiConfig } from "@/lib/web3"

interface Web3ProviderProps {
  children: ReactNode
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
