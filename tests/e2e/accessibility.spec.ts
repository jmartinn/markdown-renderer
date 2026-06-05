import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test("skip link is the first tab stop and jumps focus to the main content", async ({ page }) => {
  await page.keyboard.press("Tab")

  const skipLink = page.getByRole("link", { name: "Skip to content" })
  await expect(skipLink).toBeFocused()

  await page.keyboard.press("Enter")
  await expect(page.locator("#main-content")).toBeFocused()

  // The next Tab lands in the editor, proving the toolbar was skipped.
  await page.keyboard.press("Tab")
  await expect(page.getByLabel("Markdown source editor")).toBeFocused()
})
