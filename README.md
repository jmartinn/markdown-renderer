# Markdown Renderer

A client-only Markdown editor and previewer built with Next.js 16. It runs entirely in the browser: users can type Markdown, import `.md`, `.markdown`, or `.txt` files, preview GitHub-flavored output with syntax highlighting, copy code blocks, persist a local draft, and export the current document as Markdown.

## Local Setup

Requirements:

- Node.js `>=22`
- pnpm `11.5.0` via Corepack

```bash
corepack enable
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Commands

```bash
pnpm dev          # Start the Next.js dev server
pnpm build        # Create a production build and run Next.js validation
pnpm start        # Serve the production build
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript without emitting files
pnpm test         # Run Vitest unit/component tests
pnpm test:watch   # Run Vitest in watch mode
pnpm test:e2e     # Run Playwright Chromium E2E tests
pnpm test:e2e:ui  # Open the Playwright UI
pnpm check        # Run lint, typecheck, unit tests, build, and audit
```

## Testing

Unit and component tests live in `__tests__/` and cover Markdown rendering helpers, document state behavior, and focused UI components. E2E tests live in `tests/e2e/` and run against a production build via Playwright's `webServer`.

For local E2E runs, install the browser once:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

## Architecture

- `app/page.tsx` renders the client editor.
- `components/markdown-editor.tsx` coordinates view state, drag-and-drop, deferred preview input, and the document hook.
- `components/editor/` contains focused toolbar, editor pane, preview pane, footer, and drag/drop overlay components.
- `hooks/use-markdown-document.ts` owns the document model, file opening, export action, notices, and local draft persistence.
- `lib/markdown-document.ts` and `lib/file-transfer.ts` hold pure document and browser file helpers.
- `components/markdown-renderer.tsx` is the Markdown rendering boundary using `react-markdown`, GFM, line breaks, a curated syntax-highlight plugin (`lib/markdown-highlight.ts`), and copyable code block chrome.

See `docs/architecture.md` for more detail.

## Deployment

### Vercel

This app is ready for Vercel with the default Next.js framework preset.

- Node.js: `>=22`
- pnpm: `11.5.0`
- Build command: `pnpm build`
- No server-side environment variables are required.

### Container (GHCR + homelab)

GitHub Actions builds and pushes a production image to GHCR. The **Build image** workflow runs only after **CI** succeeds on `master` (lint, tests, build, audit, and E2E). See `docs/ci-cd.md` for workflow details, branch protection, and manual rebuilds.

The app remains client-only. File reads, draft storage, clipboard writes, and exports all happen in the browser.

## Known Limitations

- Drafts are stored only in the current browser's `localStorage`.
- Markdown rendering is client-side, so very large documents can take time to parse and highlight.
- Remote Markdown images render with raw `<img>` tags because user-provided image URLs are arbitrary and cannot be preconfigured for `next/image`.
- Export currently writes Markdown only; PDF export is not implemented.
