import { expect, test } from "@playwright/test"

test("smoke flow: markets, detail, wallet connect, trade simulation", async ({
  page,
}) => {
  await page.goto("/markets")

  await expect(page.getByRole("heading", { name: "Markets" })).toBeVisible()

  const firstMarketCard = page.locator('[data-testid^="market-card-"]').first()
  await expect(firstMarketCard).toBeVisible()
  const href = await firstMarketCard.getAttribute("href")
  if (!href) {
    throw new Error("Expected at least one market card href.")
  }
  await page.goto(href)

  await expect(page.getByTestId("market-detail-title")).toBeVisible()

  const connectButton = page.getByTestId("connect-wallet-button")
  await expect(connectButton).toBeVisible()
  await connectButton.click()

  await expect(page.getByTestId("connected-address")).toBeVisible()

  const amountInput = page.getByTestId("trade-amount-input")
  await amountInput.fill("100")

  await expect(page.getByTestId("trade-estimate")).toBeVisible()
  await expect(page.getByTestId("trade-submit-button")).toBeEnabled()
})
