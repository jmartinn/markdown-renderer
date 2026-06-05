import { expect, test } from "@playwright/test"

// Mirrors DRAFT_STORAGE_KEY in lib/markdown-document.ts (kept inline so the E2E
// build doesn't import client modules).
const DRAFT_STORAGE_KEY = "markdown-renderer:draft:v1"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test("typed content is persisted and restored across a reload", async ({ page }) => {
  const marker = "# Persistence marker 4242"
  const editor = page.getByLabel("Markdown source editor")
  await editor.fill(marker)

  // The debounced write has landed once the draft contains our marker.
  await expect
    .poll(async () => page.evaluate((key) => localStorage.getItem(key), DRAFT_STORAGE_KEY))
    .toContain("Persistence marker 4242")

  await page.reload()

  await expect(page.getByLabel("Markdown source editor")).toHaveValue(marker)
  // Restored drafts are shown as already saved.
  await expect(page.getByText("Saved ·")).toBeVisible()
})
