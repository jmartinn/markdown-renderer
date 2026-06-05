# Design & Accessibility slice — design spec

**Date:** 2026-06-05
**Phase:** 1 (Perfect the current single-doc app) — design/a11y slice
**Status:** Approved, ready for implementation planning

## Goal

Make the app genuinely accessible (WCAG 2.1 AA) and give its otherwise-achromatic
palette one deliberate accent color. Two outcomes:

1. Every key text/background and focus-indicator pair clears WCAG AA — in **both**
   light and dark themes — and stays that way (enforced by a test).
2. Links and focus rings are visibly distinct from body text via a single restrained
   **indigo** accent, without making the minimalist UI louder.

## Scope

**In scope (a11y-complete):**
- Accent color + token architecture (§1)
- Dark-mode contrast fixes (§2)
- Structural / semantic a11y: skip link, h1 landmark, preview live-region, copy
  announcement, long-URL wrapping (§3)
- Tests: contrast budget, component, E2E (§4)

**Out of scope (deferred to a later "polish" slice):**
- Mobile default-split view (`markdown-editor.tsx` default `"split"` below `sm`)
- `theme-toggle.tsx` safe-area insets
- Toolbar focus-ring offset consistency (radio/open-file vs. export)
- `error.tsx` copy clarity

(Also out of scope for the whole project right now: multi-doc/sidebar — Phase 2;
auth — skipped.)

## Resolved decisions

- **A — Accent tokens:** introduce a single canonical `--md-accent` source of truth;
  `--md-link` and `--md-focus` derive from it. (Not: edit `--md-link` in place.)
- **B — AA verification:** add a permanent contrast-budget unit test using `culori`.
  (Not: a one-off manual check.)
- **C — Delivery:** two PRs — PR A (color & contrast) then PR B (structural a11y).

## §1 — Accent color (Indigo) + token architecture

Indigo, hue ~285. One canonical token per theme, then everything references it.

New / changed tokens in `app/globals.css`:

| Token | Light (start) | Dark (start) | Notes |
|---|---|---|---|
| `--md-accent` *(new)* | `oklch(0.47 0.17 285)` | `oklch(0.74 0.14 285)` | AA-tuned ≥4.5:1 for link-size text; exact L verified by §4 test |
| `--md-link` | `var(--md-accent)` | `var(--md-accent)` | was `oklch(0.35 0 0)` / `oklch(0.82 0 0)` (latter == body) |
| `--md-link-decoration` | `oklch(0.47 0.17 285 / 0.4)` | `oklch(0.74 0.14 285 / 0.4)` | subtle indigo underline; reads as a link, not neutral gray; decorative (no AA requirement) |
| `--md-focus` *(new)* | `var(--md-accent)` | `var(--md-accent)` | single focus-visible ring color, app-wide |

Consumers:
- `components/markdown-renderer.tsx` `a` (~line 58) already uses `--md-link` /
  `--md-link-decoration` — picks up the accent automatically.
- `components/editor/editor-pane.tsx` textarea (~line 26): focus ring
  `--md-border-strong` (~1.9:1, invisible) → `--md-focus` (keep `ring-inset`).
- `components/editor/markdown-toolbar.tsx` rings (lines ~99, ~135, ~148): `--md-link`
  → `--md-focus` for semantic clarity (visually unchanged once link == accent).

Everything else stays achromatic. Indigo is the one point of color, alongside the
existing `--md-danger` red and the syntax-highlight palette.

## §2 — Dark-mode contrast fixes (WCAG AA)

Dark tokens were never re-tuned per-theme; several equal their light values and fail
on the dark background. Raise (exact values chosen against the §4 test):

| Token (dark) | From | To (target) | Drives |
|---|---|---|---|
| `--md-muted` | `oklch(0.56 0 0)` | `~oklch(0.68 0 0)` | footer, SOURCE/PREVIEW labels, counts, Draft label, info notices |
| `--md-code-lang` | `oklch(0.52 0 0)` | `~oklch(0.66 0 0)` | 11px code-header language label |
| `--md-code-copy` | `oklch(0.5 0 0)` | `~oklch(0.66 0 0)` | code-header Copy button |

Light tokens are expected to already pass and are left unchanged **unless** the §4
test reports a failure; targets are whatever clears the thresholds, not these exact
numbers.

## §3 — Structural / semantic a11y

- **Skip link** — `components/markdown-editor.tsx`: add a visually-hidden "Skip to
  content" anchor as the **first focusable** element (before the toolbar), becoming
  visible on focus, `href="#main-content"`. Add `id="main-content"` and `tabIndex={-1}`
  to the existing `<main>` (~line 62). Targeting `<main>` keeps it robust across all
  three views (editor / split / preview).
- **h1 landmark** — `components/editor/markdown-toolbar.tsx` (~lines 63–66): convert
  the brand text ("Markdown" + "Renderer") into a single `<h1>`, styled to look
  pixel-identical. Provides the page's required top-level heading with no visual change.
- **Preview live-region** — `components/editor/preview-pane.tsx` (~lines 38–42): remove
  `role="status"` / `aria-live="polite"` from the "Updating preview…" indicator. It's a
  transient visual spinner; it stays visible but is no longer announced on every
  deferred lag.
- **Copy announcement** — `components/editor/copy-button.tsx`: add a visually-hidden
  (`sr-only`) `role="status"` / `aria-live="polite"` region that becomes "Copied" on
  success. (A swapped button `aria-label` is not reliably announced.)
- **Long-URL wrapping** — `components/markdown-renderer.tsx` `p` / `a` / `li`
  (~lines 48–73): add `overflow-wrap` (`break-words`) so long URLs don't overflow.

## §4 — Testing (TDD)

- **Contrast-budget unit test** — new `__tests__/contrast.test.ts`:
  - Parse `--md-*` values from `app/globals.css` (`:root` block = light, `.dark` block
    = dark) via regex.
  - Convert with **`culori`** (new devDep) and compute WCAG contrast ratios.
  - Assert, for **each theme**:
    - `≥4.5:1` (normal text): body, muted, heading, link(=accent) on `--md-bg`; body &
      muted on `--md-surface`; `--md-editor-text` on `--md-editor-bg`;
      `--md-code-inline-text` on `--md-code-inline-bg`; `--md-code-lang` &
      `--md-code-copy` on `--md-code-header`.
    - `≥3:1` (non-text): `--md-focus` ring on `--md-bg` and on `--md-editor-bg`.
  - Written **red first**, then token values in §1/§2 are tuned until green. This is the
    durable regression guard ("test & CI trust").
- **Component tests** (Vitest + testing-library, plain assertions — no jest-dom):
  - Toolbar renders the brand as an `<h1>` with accessible name "Markdown Renderer".
  - Copy button exposes a `role="status"` region that flips to "Copied" after a copy.
  - Preview "Updating preview…" indicator has neither `role="status"` nor `aria-live`
    (both are dropped — `role="status"` itself implies a live region).
- **E2E** (Playwright, `tests/e2e`): from a fresh load, the first Tab focuses the
  "Skip to content" link; activating it moves focus to `#main-content`; the next Tab
  lands in the editor (proving the toolbar was skipped). Skip-link focus order lives in
  E2E because jsdom has no real tab order (and a full editor render would also need a
  `matchMedia` polyfill).

## §5 — Delivery / PR packaging

Two PRs, each green through CI (`check` + `e2e`) before merge (squash, branch
protection on `master`):

- **PR A — Color & contrast:** `--md-accent` / `--md-link` / `--md-focus` tokens, dark
  contrast fixes, focus-ring unification, link styling, break-words, + the
  contrast-budget test (`culori` devDep).
- **PR B — Structural a11y:** skip link + `<main>` target, h1 landmark, preview
  live-region removal, copy announcement, + component & E2E tests.

## Acceptance criteria

- Contrast-budget test passes: all listed pairs ≥ AA in both themes.
- Links are visibly distinct from body text in both themes (indigo).
- Keyboard: skip link is first focusable, visible on focus, moves focus to main.
- The app shell exposes an `<h1>` (the brand) as the page's first heading; rendered
  Markdown headings remain as authored.
- "Updating preview…" is not announced; copy success is announced.
- Long URLs wrap instead of overflowing.
- `pnpm check` and `pnpm test:e2e` green for both PRs.
