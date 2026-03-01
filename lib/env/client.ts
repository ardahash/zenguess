import { z } from "zod"

const clientSchema = z.object({
  NEXT_PUBLIC_DEFAULT_CHAIN: z.enum(["mainnet", "testnet"]).default("testnet"),
  NEXT_PUBLIC_HORIZEN_MAINNET_RPC_HTTP: z.string().url(),
  NEXT_PUBLIC_HORIZEN_MAINNET_RPC_WS: z.string().url(),
  NEXT_PUBLIC_HORIZEN_MAINNET_EXPLORER_URL: z.string().url(),
  NEXT_PUBLIC_HORIZEN_TESTNET_RPC_HTTP: z.string().url(),
  NEXT_PUBLIC_HORIZEN_TESTNET_RPC_WS: z.string().url(),
  NEXT_PUBLIC_HORIZEN_TESTNET_EXPLORER_URL: z.string().url(),
  NEXT_PUBLIC_HORIZEN_BRIDGE_URL: z.string().url(),
  NEXT_PUBLIC_HORIZEN_TESTNET_FAUCET_URL: z.string().url(),
  NEXT_PUBLIC_ENABLE_MOCK_WALLET: z.enum(["true", "false"]).default("false"),
  NEXT_PUBLIC_GATEWAY_MODE: z.enum(["mock", "onchain"]).default("mock"),
  NEXT_PUBLIC_GOLDSKY_ENDPOINT: z
    .string()
    .url()
    .optional()
    .or(z.literal("")),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().optional().or(z.literal("")),
})

function optionalEnv(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function formatValidationError(
  result: z.SafeParseError<z.infer<typeof clientSchema>>
): string {
  const issues = result.error.issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n")

  return `Invalid NEXT_PUBLIC environment variables:\n${issues}`
}

const parsedClientEnv = clientSchema.safeParse({
  NEXT_PUBLIC_DEFAULT_CHAIN: optionalEnv(process.env.NEXT_PUBLIC_DEFAULT_CHAIN),
  NEXT_PUBLIC_HORIZEN_MAINNET_RPC_HTTP:
    optionalEnv(process.env.NEXT_PUBLIC_HORIZEN_MAINNET_RPC_HTTP) ??
    optionalEnv(process.env.NEXT_PUBLIC_HORIZEN_RPC_HTTP) ??
    "https://horizen.calderachain.xyz/http",
  NEXT_PUBLIC_HORIZEN_MAINNET_RPC_WS:
    optionalEnv(process.env.NEXT_PUBLIC_HORIZEN_MAINNET_RPC_WS) ??
    optionalEnv(process.env.NEXT_PUBLIC_HORIZEN_RPC_WS) ??
    "wss://horizen.calderachain.xyz/ws",
  NEXT_PUBLIC_HORIZEN_MAINNET_EXPLORER_URL:
    optionalEnv(process.env.NEXT_PUBLIC_HORIZEN_MAINNET_EXPLORER_URL) ??
    optionalEnv(process.env.NEXT_PUBLIC_EXPLORER_URL) ??
    "https://horizen.calderaexplorer.xyz",
  NEXT_PUBLIC_HORIZEN_TESTNET_RPC_HTTP:
    optionalEnv(process.env.NEXT_PUBLIC_HORIZEN_TESTNET_RPC_HTTP) ??
    "https://horizen-testnet.rpc.caldera.xyz/http",
  NEXT_PUBLIC_HORIZEN_TESTNET_RPC_WS:
    optionalEnv(process.env.NEXT_PUBLIC_HORIZEN_TESTNET_RPC_WS) ??
    "wss://horizen-testnet.rpc.caldera.xyz/ws",
  NEXT_PUBLIC_HORIZEN_TESTNET_EXPLORER_URL:
    optionalEnv(process.env.NEXT_PUBLIC_HORIZEN_TESTNET_EXPLORER_URL) ??
    "https://horizen-testnet.explorer.caldera.xyz",
  NEXT_PUBLIC_HORIZEN_BRIDGE_URL:
    optionalEnv(process.env.NEXT_PUBLIC_HORIZEN_BRIDGE_URL) ??
    optionalEnv(process.env.NEXT_PUBLIC_BRIDGE_URL) ??
    "https://horizen.hub.caldera.xyz",
  NEXT_PUBLIC_HORIZEN_TESTNET_FAUCET_URL:
    optionalEnv(process.env.NEXT_PUBLIC_HORIZEN_TESTNET_FAUCET_URL) ??
    "https://horizen-testnet.hub.caldera.xyz",
  NEXT_PUBLIC_ENABLE_MOCK_WALLET:
    optionalEnv(process.env.NEXT_PUBLIC_ENABLE_MOCK_WALLET),
  NEXT_PUBLIC_GATEWAY_MODE: optionalEnv(process.env.NEXT_PUBLIC_GATEWAY_MODE),
  NEXT_PUBLIC_GOLDSKY_ENDPOINT: optionalEnv(
    process.env.NEXT_PUBLIC_GOLDSKY_ENDPOINT
  ),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
    optionalEnv(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID),
})

if (!parsedClientEnv.success) {
  throw new Error(formatValidationError(parsedClientEnv))
}

const env = parsedClientEnv.data

export const clientEnv = {
  ...env,
  NEXT_PUBLIC_ENABLE_MOCK_WALLET: env.NEXT_PUBLIC_ENABLE_MOCK_WALLET === "true",
  NEXT_PUBLIC_GOLDSKY_ENDPOINT: env.NEXT_PUBLIC_GOLDSKY_ENDPOINT || undefined,
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
    env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || undefined,
} as const

export type ClientEnv = typeof clientEnv
