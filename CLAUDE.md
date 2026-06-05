# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm**.

```bash
pnpm dev        # Next.js dev server (http://localhost:3000)
pnpm build      # production build (runs the TypeScript check)
pnpm start      # serve production build
pnpm lint       # eslint . (flat config, eslint-config-next)
pnpm typecheck  # tsc --noEmit
pnpm test       # Vitest unit/component tests
pnpm test:e2e   # Playwright Chromium E2E tests
pnpm check      # lint, typecheck, test, build, audit
```

Playwright uses a production `pnpm build && next start` web server through `playwright.config.ts`.

## What this is

A single-page, fully client-side Markdown editor + live previewer. The entire app is one route: `app/page.tsx` renders `<MarkdownEditor />`. No backend, API routes, or server actions. File open/export, draft persistence, and clipboard behavior happen in-browser via browser APIs.

## Architecture

The main boundaries are:

- **`app/page.tsx`** → renders `MarkdownEditor`.
- **`components/markdown-editor.tsx`** (`"use client"`) — coordinates view state, drag-and-drop, deferred preview content, and the document hook.
- **`components/editor/`** — focused toolbar, editor pane, preview pane, footer, and drag/drop overlay components.
- **`hooks/use-markdown-document.ts`** — owns the document model (`content`, `fileName`, `dirty`, `lastLoadedAt`, `source`), localStorage draft persistence, file import/export, notices, and counts.
- **`lib/`** — pure document, file transfer, and Markdown rendering helpers.
- **`components/markdown-renderer.tsx`** (`"use client"`) — wraps `react-markdown` with `remark-gfm` + `remark-breaks` and the curated highlight plugin in `lib/markdown-highlight.ts`. Every HTML element is restyled through a `components` map.

### Code-block rendering is the subtle part

`lib/markdown-highlight.ts` (`rehypeCuratedHighlight`) highlights fenced code into nested `<span>`s before `react-markdown` builds the React tree. The custom `pre` override in `markdown-renderer.tsx` therefore:
1. Reads the language from the child `<code>`'s `language-*` className.
2. Uses the pure helper in `lib/markdown-rendering.ts` to recover the **raw** text for the copy-to-clipboard button.
3. Renders the highlighted children directly inside the styled chrome.

The `code` override distinguishes inline code (no `className`) from block code (handled by `pre`).

We deliberately do **not** use `rehype-highlight`: it statically imports lowlight's `common` set (~37 grammars) and bundles all of it regardless of options, so it can't be tree-shaken. `lib/markdown-highlight.ts` builds its own lowlight instance from a curated ~10-language set to keep the preview chunk small. To support a new fenced-code language, add a grammar import there and an alias in the same file.

When touching code highlighting, remember highlight.js themes are split: the **light** theme is imported in `app/globals.css` (`highlight.js/styles/github.css`); the **dark** theme is hand-written as `.dark .hljs*` rules further down in the same file. Changing one without the other breaks a theme.

## Theming

`app/globals.css` holds two token sets:

- **`--md-*` tokens** — the design system this app's UI reads. Defined for light (`:root`) and dark (`.dark`). Components reference them inline as `bg-[var(--md-bg)]`, etc. To restyle the app, edit these tokens, not the components.
  The single accent is `--md-accent` (indigo); `--md-link` and the app-wide
  focus ring `--md-focus` both reference it. WCAG AA for the key token pairs is
  enforced by `__tests__/contrast.test.ts` (it parses this file with `culori`), so
  changing a color token to a failing value fails CI.
- A small set of base shadcn-style tokens (`--background`, `--foreground`, `--border`, `--ring`, `--radius`) mapped into Tailwind's `@theme inline`. These survive only because the `@layer base` reset (`* { border-border }`, `body { bg-background text-foreground }`) and `app/layout.tsx` (`bg-background`) use them.

`next-themes` drives the `.dark` class (`attribute="class"`, `defaultTheme="system"`). `ThemeToggle` in `components/editor/theme-toggle.tsx` cycles light → dark → system and is mounted once at the bottom of `MarkdownEditor`. `app/providers.tsx` wraps the app with `next-themes`. Its mount-guard `useEffect` carries an `eslint-disable react-hooks/set-state-in-effect` because the SSR hydration guard is a deliberate exception to that rule.

## Conventions & gotchas

- Path alias: `@/*` → repo root (`tsconfig.json`).
- Tailwind is **v4** (CSS-first, `@import 'tailwindcss'` in `app/globals.css`; no `tailwind.config`). PostCSS uses `@tailwindcss/postcss`; autoprefixer is not needed (Tailwind v4 handles it).
- ESLint uses **flat config** (`eslint.config.mjs`) importing `eslint-config-next`'s native flat exports (`core-web-vitals` + `typescript`) directly — not the `FlatCompat` bridge, which hits a circular-structure bug with eslint-config-next 16. `unrs-resolver` must stay allowlisted in `pnpm-workspace.yaml` or `pnpm lint`'s dependency check fails.
- The build runs the TypeScript check (`next.config.mjs` no longer sets `ignoreBuildErrors`), so type errors fail `pnpm build`.
- Markdown images render via a raw `<img>` (with an inline `eslint-disable @next/next/no-img-element`) because sources are arbitrary remote URLs — `next/image` is intentionally not used.
- `@vercel/analytics` is only mounted on Vercel (`VERCEL === '1'`) so local production E2E runs do not request Vercel's hosted analytics script.
- The app shell has one fixed `<h1>` — the toolbar brand (`aria-label="Markdown Renderer"`) — as its heading landmark. Rendered Markdown can legitimately contain its own `<h1>`s, so **multiple `<h1>`s coexist by design**; don't "dedupe" them. Tests/lookups scope by accessible name to stay unambiguous. The skip link (`markdown-editor.tsx`) targets `<main id="main-content" tabIndex={-1}>`; that `tabIndex`/`outline-none` is the focus landing pad, not a stray attribute.
- Save state lives in `useMarkdownDocument` as a `saveStatus` enum (`saved | unsaved | saving | error`), surfaced in the toolbar subtitle. It is driven by two effects: a debounce-**schedule** effect (skips `source: "sample" | "restored"`, so the canonical/just-restored doc doesn't re-write or flash "Saving…") and a follow-up **write** effect that runs after the "Saving…" commit paints. `document.dirty` is now **vestigial** — retained in the persisted v1 schema but read by nothing; `saveStatus` is authoritative. Don't rewire the UI to `dirty`.
- Notices flow through `useDismissibleNotice` (`hooks/use-dismissible-notice.ts`): info notices auto-dismiss after `INFO_NOTICE_DISMISS_MS` (5 s); errors are sticky and cleared via the `×` in `NoticeMessage`. `NoticeMessage` (`components/editor/notice-message.tsx`) is the single notice renderer used by both the toolbar and the footer; its `role="status"` live region is **always** in the DOM (empty when idle) so announcements fire reliably — don't make it conditional.
