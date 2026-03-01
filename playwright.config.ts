import { defineConfig, devices } from "@playwright/test"

const port = Number(process.env.PORT ?? 3100)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_ENABLE_MOCK_WALLET: "true",
      NEXT_PUBLIC_DEFAULT_CHAIN: "testnet",
    },
  },
})
