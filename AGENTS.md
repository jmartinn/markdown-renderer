# Repository Guidelines

## Project Structure & Module Organization

This is a small Next.js 16 app for editing Markdown and previewing rendered output. The only route is `app/page.tsx`, which renders the client-side editor. `components/markdown-editor.tsx` coordinates the editor shell, while focused UI pieces live in `components/editor/`. `hooks/use-markdown-document.ts` owns document state, draft persistence, upload/export actions, and notices. Pure helpers live in `lib/`, including document modeling, file transfer, and Markdown rendering utilities. `components/markdown-renderer.tsx` handles `react-markdown`, GFM, line breaks, syntax highlighting, and copyable code blocks. Global styles, Tailwind v4 setup, design tokens, and highlight.js theme overrides live in `app/globals.css`. Unit/component tests are in `__tests__/`, Playwright specs are in `tests/e2e/`, and architecture docs are in `docs/`.

## Build, Test, and Development Commands

Use `pnpm` for all package operations.

- `pnpm dev`: start the local Next.js dev server, normally at `http://localhost:3000`.
- `pnpm build`: create a production build and run Next.js type validation.
- `pnpm start`: serve the production build after `pnpm build`.
- `pnpm lint`: run ESLint with the flat Next.js config.
- `pnpm typecheck`: run `tsc --noEmit`.
- `pnpm test`: run Vitest unit/component tests.
- `pnpm test:e2e`: run Playwright Chromium E2E tests against a production build/start flow.
- `pnpm check`: run lint, typecheck, unit tests, build, and audit.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Keep component files in kebab case, such as `markdown-editor.tsx`, and export PascalCase components. Prefer the existing `@/*` path alias for root-relative imports. Follow strict TypeScript settings and avoid weakening types unless the dependency boundary requires it. Styling uses Tailwind v4 CSS-first conventions and CSS variables from `app/globals.css`; adjust tokens there before scattering new hard-coded colors through components.

## Testing Guidelines

Validate production-facing changes with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; run `pnpm test:e2e` for editor workflow, file import/export, clipboard, theme, or responsive layout changes. Keep unit/component tests close to the affected boundary and use descriptive names like `markdown-renderer.test.tsx`. Cover Markdown rendering edge cases such as fenced code, tables, links, images, task lists, malformed Markdown, and copy text extraction.

## Commit & Pull Request Guidelines

There is no committed history yet, so use concise, imperative commit messages, for example `Add markdown export shortcut` or `Fix dark code block colors`. Pull requests should describe the user-facing change, list validation commands run, link related issues, and include screenshots or short recordings for visual editor changes. Call out changes to Markdown rendering, theme tokens, or dependencies because those can affect many examples at once.

## Agent-Specific Instructions

Do not edit generated output such as `.next/`, `node_modules/`, Playwright reports, or `tsconfig.tsbuildinfo`. Preserve the current client-only architecture unless the task explicitly introduces backend behavior. Keep document behavior in `hooks/use-markdown-document.ts` or `lib/` rather than burying product logic in UI components. When touching code highlighting, verify both the imported light highlight.js theme and the custom dark `.hljs` rules in `app/globals.css`. Markdown images intentionally use raw `<img>` because sources are arbitrary user-provided URLs.
