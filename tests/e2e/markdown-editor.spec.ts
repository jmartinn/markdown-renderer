import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('edits Markdown and updates the preview', async ({ page }) => {
  await page.getByLabel('Markdown source editor').fill('# Preview Test\n\n**Bold copy**')

  await expect(page.getByRole('heading', { level: 1, name: 'Preview Test' })).toBeVisible()
  await expect(page.getByLabel('Rendered preview').getByText('Bold copy')).toBeVisible()
})

test('switches editor, split, and preview modes on desktop and mobile', async ({ page }) => {
  await page.getByRole('radio', { name: 'preview' }).click()
  await expect(page.getByLabel('Markdown source editor')).toBeHidden()
  await expect(page.getByLabel('Rendered preview')).toBeVisible()

  await page.getByRole('radio', { name: 'editor' }).click()
  await expect(page.getByLabel('Markdown source editor')).toBeVisible()
  await expect(page.getByLabel('Rendered preview')).toBeHidden()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('radio', { name: 'split' }).click()
  await expect(page.getByLabel('Markdown source editor')).toBeVisible()
  await expect(page.getByLabel('Rendered preview')).toBeVisible()
})

test('uploads supported files and rejects unsupported files', async ({ page }) => {
  const input = page.getByLabel('Open file')

  await input.setInputFiles({
    name: 'notes.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Uploaded md'),
  })
  await expect(page.getByRole('heading', { level: 1, name: 'Uploaded md' })).toBeVisible()

  await input.setInputFiles({
    name: 'notes.markdown',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Uploaded markdown'),
  })
  await expect(page.getByRole('heading', { level: 1, name: 'Uploaded markdown' })).toBeVisible()

  await input.setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('# Uploaded txt'),
  })
  await expect(page.getByRole('heading', { level: 1, name: 'Uploaded txt' })).toBeVisible()

  await input.setInputFiles({
    name: 'notes.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF'),
  })
  await expect(page.getByRole('status').filter({ hasText: /Only \.md, \.markdown, \.txt files are supported/ }).first()).toBeVisible()
})

test('exports Markdown content with a document-based filename', async ({ page }) => {
  await page.getByLabel('Open file').setInputFiles({
    name: 'release notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('# Release\n\nReady to ship.'),
  })

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export release-notes\.md/ }).click()
  const download = await downloadPromise
  const path = await download.path()

  expect(download.suggestedFilename()).toBe('release-notes.md')
  expect(path).toBeTruthy()
  const downloadedContent = await readFile(path ?? '', 'utf8')
  expect(downloadedContent).toContain('Ready to ship.')
})

test('copies code block text', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByLabel('Markdown source editor').fill('```ts\nconst copied = true\n```')

  const preview = page.getByLabel('Rendered preview')
  await expect(preview.getByText('const copied = true')).toBeVisible()
  await preview.getByRole('button', { name: 'Copy code' }).click()

  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboardText).toContain('const copied = true')
})

test('toggles theme without console or runtime errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`)
  })

  await page.getByRole('button', { name: /Current theme:|Toggle theme/ }).click()
  await page.getByRole('button', { name: /Current theme:/ }).click()

  expect(errors).toEqual([])
})
