import { z } from "zod"

const serverSchema = z.object({
  DEPLOYER_PRIVATE_KEY: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
})

function formatValidationError(
  result: z.SafeParseError<z.infer<typeof serverSchema>>
): string {
  const issues = result.error.issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n")

  return `Invalid server environment variables:\n${issues}`
}

if (typeof window !== "undefined") {
  throw new Error("serverEnv must never be imported in client-side code.")
}

const parsedServerEnv = serverSchema.safeParse({
  DEPLOYER_PRIVATE_KEY: process.env.DEPLOYER_PRIVATE_KEY,
})

if (!parsedServerEnv.success) {
  throw new Error(formatValidationError(parsedServerEnv))
}

const env = parsedServerEnv.data

export const serverEnv = {
  DEPLOYER_PRIVATE_KEY: env.DEPLOYER_PRIVATE_KEY || undefined,
} as const

export type ServerEnv = typeof serverEnv
