# Data-safety / UX slice — design spec

**Date:** 2026-06-05
**Phase:** 1 (Perfect the current single-doc app) — data-safety/UX slice
**Status:** Approved, ready for implementation planning

## Goal

Make the editor honestly communicate the state of the user's data and stop
leaving stale UI behind. Three outcomes:

1. The user can always tell whether their work is persisted — a real save-status
   indicator (Unsaved → Saving… → Saved, plus Save failed) replaces today's
   "Draft"/"Loaded" label that never resolves.
2. Transient confirmations get out of the way (info notices auto-dismiss), while
   errors stay until acknowledged (sticky, with a manual dismiss).
3. Persistence degrades gracefully — a quota failure says something specific and
   actionable, and a broken store does not re-nag on every keystroke.

## Background (current behavior, verified 2026-06-05)

- `hooks/use-markdown-document.ts` sets `document.dirty = true` on every keystroke
  (`updateContent`, ~line 134) and **never clears it** after the 400 ms debounced
  autosave persists (`:88-93`). The toolbar subtitle reads
  `{document.dirty ? "Draft" : "Loaded"}: {fileName}`
  (`components/editor/markdown-toolbar.tsx:72`), so after the first keystroke it
  reads "Draft: …" permanently — no save confirmation.
- `clearNotice` exists in the hook (`:171-173`) but is **never called**:
  `components/markdown-editor.tsx` does not even destructure it. Notices (info or
  error) persist until replaced by the next notice.
- Persistence basics already exist: debounced write (`:81-96`), synchronous flush
  on `pagehide` / `visibilitychange` (`:98-117`), and a try/catch in `writeDraft`
  (`:47-56`) that surfaces a generic failure notice. A `QuotaExceededError` reads
  identically to any other failure, and a persistently-failing store re-notifies
  on every debounce tick.

## Scope

**In scope:**
- Save-status state machine in the hook + toolbar indicator (§1)
- Notice lifecycle: auto-dismiss info, sticky+dismissible errors (§2)
- Targeted persistence hardening: quota-aware copy, once-per-failure notice (§3)
- Tests: pure helpers, hook, component, E2E (§4)

**Out of scope (deferred):**
- Cross-tab / multi-instance sync (the `storage` event) — overlaps Phase 2
  (multi-doc) and adds real complexity for a single-doc tool.
- A relative "Saved 2 m ago" timestamp (rejected during brainstorming — needs a
  ticking clock for marginal benefit).
- The known `extractTextFromReactNode` HTML-entity edge case
  (`lib/markdown-rendering.ts`) — unrelated to data safety; stays on the backlog.
- Removing the now-vestigial `document.dirty` field — see §1; keeping it avoids a
  storage-schema migration this slice doesn't need.

## Resolved decisions

- **A — Save indicator:** a status machine (`saved | unsaved | saving | error`),
  not a one-off "clear dirty" fix and not a ticking timestamp.
- **B — Notices:** info auto-dismisses after a fixed delay; errors are sticky with
  a manual `×`; the dead `clearNotice` gets wired to it.
- **C — Persistence:** targeted hardening (quota-aware message + once-per-failure
  notice + tests); cross-tab sync explicitly deferred.
- **D — Architecture:** targeted extraction — pure helpers in `lib/`, a focused
  notice hook, and a shared presentational notice component; `useMarkdownDocument`
  stays the coordinator. (Not an inline-everything hook; not a full `useReducer`
  rewrite.)
- **E — "Saving…" realization:** the transient is produced by committing the
  `"saving"` status first and performing the synchronous write in a *follow-up
  effect*, so the indicator paints before the (potentially heavy) write — no manual
  `requestAnimationFrame` bookkeeping.
- **F — Delivery:** two PRs (save-status + persistence, then notices), each green
  through CI before merge.

## §1 — Save-status state machine

Introduce a hook-level status enum. `saveStatus` becomes the single source of truth
for the indicator; `document.dirty` is retained only as part of the persisted v1
schema (avoids a storage migration) and is **no longer read by the UI**.

```ts
export type SaveStatus = "saved" | "unsaved" | "saving" | "error"
```

**Transitions (in `useMarkdownDocument`):**

| Trigger | `saveStatus` | Notes |
|---|---|---|
| initial mount (sample) and restored draft | `"saved"` | the restored draft came from storage; the sample needs no save until edited — avoids a startup flash and a needless first write |
| `updateContent` (typing) | `"unsaved"` | debounced persist scheduled |
| `openFile` success | `"unsaved"` | the freshly opened file (`source: "uploaded"`) is scheduled for a debounced persist like any edit |
| debounce fires (after typing settles) | `"saving"` | see realization below |
| write succeeds | `"saved"` | clears a stale save-error notice (§3) |
| write throws | `"error"` | emits one notice per failure transition (§3) |

**Persistence trigger (replaces the raw `[document]` write effect):**

- *Schedule effect* — deps `[document, draftReady]`; guard `if (!draftReady) return`
  then `if (document.source === "sample" || document.source === "restored") return`.
  The sample and a freshly-restored draft already live in their canonical place, so
  they schedule nothing — which avoids a startup "Saving…" flash and a needless first
  write. For any user-authored document (`source: "typed" | "uploaded"`) each change
  resets a 400 ms `setTimeout`; on fire it calls `setSaveStatus("saving")`. Cleanup
  clears the timer. (Gating on `document.source` rather than `saveStatus` keeps the
  dependency array exhaustive without an eslint disable.)
- *Write effect* — deps `[saveStatus, storage]` (+ refs); guard
  `if (saveStatus !== "saving") return`. React commits (and the browser paints) the
  `"Saving…"` indicator before this `useEffect` runs; the effect then performs the
  synchronous `writeDraft(storage, latestDocumentRef.current)` and resolves to
  `"saved"` or `"error"`. This is the honest "yield a frame" with no `rAF`
  cleanup to get wrong. (Reading from `latestDocumentRef` — already maintained at
  `:76-79`, declared *before* this effect so the ref is current — keeps `document`
  out of the deps.)

The existing `pagehide` / `visibilitychange` flush (`:98-117`) is unchanged: a
best-effort synchronous write of the latest ref so an in-flight debounce isn't lost
on exit.

**`dirty` becomes vestigial, not removed:** `updateContent`/`openFile` keep setting
`document.dirty` as they do today and it stays in the persisted v1 schema, but no
component reads it — `saveStatus` is authoritative. The stored draft may therefore
carry `dirty: true`; this is invisible because the restore path sets
`saveStatus = "saved"` regardless. `serializeDraft`/`parseStoredDraft` and
`MarkdownDocument` keep their current shape — no version bump, no draft-storage test
churn. (Removing `dirty` outright is deferred — it would force a storage migration
this slice doesn't need.)

**Toolbar (`markdown-toolbar.tsx`):** the subtitle (`:71-73`) reads the status, not
`document.dirty`. `MarkdownToolbar` gains a `saveStatus: SaveStatus` prop (passed
from `markdown-editor.tsx`). A local label map renders the word:

```ts
const SAVE_STATUS_LABEL: Record<SaveStatus, string> = {
  saved: "Saved",
  unsaved: "Unsaved",
  saving: "Saving…",
  error: "Save failed",
}
```

Subtitle becomes `{SAVE_STATUS_LABEL[saveStatus]} · {document.fileName}` (same
`hidden md:block` styling/truncation as today). When `saveStatus === "error"`, the
word uses `text-[var(--md-danger)]`; otherwise the existing `text-[var(--md-muted)]`.

## §2 — Notice lifecycle

**New hook `hooks/use-dismissible-notice.ts`** owns the notice and its timer:

```ts
export const INFO_NOTICE_DISMISS_MS = 5000

export function useDismissibleNotice(): {
  notice: DocumentNotice | null
  showNotice: (notice: DocumentNotice) => void
  clearNotice: () => void
}
```

- `showNotice(n)` stores the notice. For `n.type === "info"` it (re)schedules a
  `setTimeout` of `INFO_NOTICE_DISMISS_MS` that clears the notice; for
  `n.type === "error"` it schedules **no** timer (sticky). Any pending timer is
  cleared before a new notice is shown and on unmount.
- `clearNotice()` clears the notice and any pending timer.

`useMarkdownDocument` consumes this hook: every current `setNotice({...})` call
becomes `showNotice({...})`, and the hook re-exports `notice` and `clearNotice`
(the latter is no longer dead). `DocumentNotice` / `DocumentNoticeType` keep their
current definitions and exported location.

**New component `components/editor/notice-message.tsx`** — one presentational unit
used by both render sites:

```ts
interface NoticeMessageProps {
  notice: DocumentNotice | null
  onDismiss: () => void
  className?: string
}
```

- Renders an **always-present** `role="status" aria-live="polite"` container so
  announcements fire reliably (a region added to the DOM at the same time as its
  text often does not announce). The message text and the dismiss control render
  only when `notice` is non-null; the empty region is visually nothing.
- The dismiss `×` renders only when `notice.type === "error"` (info dismisses
  itself), is a real `<button type="button" aria-label="Dismiss notice">`, and
  calls `onDismiss`. It carries the app focus ring (`focus-visible:ring-2
  focus-visible:ring-[var(--md-focus)]`).
- Error text keeps `text-[var(--md-danger)]`; info keeps `text-[var(--md-muted)]`.
- `className` lets each site keep its layout: the toolbar's stacked spot under the
  counts (`hidden lg:flex` column) and the footer's centered `lg:hidden` slot.

`markdown-toolbar.tsx` (`:118-128`) and `editor-footer.tsx` (`:13-23`) replace
their inline notice `<span>` with `<NoticeMessage notice={notice}
onDismiss={onClearNotice} className=… />`. `markdown-editor.tsx` destructures
`clearNotice` and passes it to both. The two regions are mutually exclusive by
breakpoint (one is `display:none`), so only the visible one announces — no
double-announcement.

## §3 — Persistence hardening

**Pure helpers in `lib/draft-storage.ts`:**

```ts
export type StorageFailureReason = "quota" | "unknown"

export function classifyStorageError(error: unknown): StorageFailureReason
export function describeSaveError(reason: StorageFailureReason): string
```

- `classifyStorageError` returns `"quota"` for a `DOMException` whose `name` is
  `"QuotaExceededError"` / `"NS_ERROR_DOM_QUOTA_REACHED"` or whose legacy `code` is
  `22` / `1014`; otherwise `"unknown"`.
- `describeSaveError`:
  - `"quota"` → `"Your draft is too large to save in this browser."`
  - `"unknown"` → `"Draft changes could not be saved in this browser."` (today's copy)

**`writeDraft` returns a discriminated result** instead of `boolean`:

```ts
type WriteResult = { ok: true } | { ok: false; reason: StorageFailureReason }
```

On a caught error it returns `{ ok: false, reason: classifyStorageError(error) }`.
When `storage` is null it returns `{ ok: true }` (nothing to persist — not a
failure; matches today's silent no-op).

**Once-per-failure + recovery (write effect, §1):**

- On `{ ok: false }`: set `saveStatus = "error"`. Track a
  `notifiedSaveErrorRef`; only `showNotice({ type: "error", message:
  describeSaveError(reason) })` when it is not yet set, then set it. This prevents
  a broken store from re-nagging on every debounce tick.
- On `{ ok: true }`: set `saveStatus = "saved"`. If `notifiedSaveErrorRef` was set,
  `clearNotice()` (drop the stale save-error banner) and reset the ref.

The `pagehide`/`visibilitychange` flush ignores the result (best-effort on exit).

## §4 — Testing (TDD)

Coverage `include` stays `lib/**` + `hooks/**`; the new component/E2E tests don't
move thresholds. Plain assertions (no jest-dom), per repo convention.

**Pure unit (`__tests__/draft-storage.test.ts`, extend existing):**
- `classifyStorageError`: a `QuotaExceededError` `DOMException` → `"quota"`;
  `code === 22` → `"quota"`; a generic `Error` → `"unknown"`.
- `describeSaveError`: each reason → its exact string.

**Hook (`__tests__/use-markdown-document.test.tsx`, extend existing):** use
`renderHook` + `vi.useFakeTimers`, inject an in-memory `storage`.
- Typing sets `saveStatus === "unsaved"`; after advancing past the debounce the
  status reaches `"saved"` and the draft is in storage.
- A `storage.setItem` that throws a quota `DOMException` drives `saveStatus` to
  `"error"` with the quota message. Once-per-failure is asserted observably:
  dismiss the error (`clearNotice`), run another failing edit cycle, and the notice
  stays `null` (not re-shown). After `setItem` is restored, a successful write
  returns `saveStatus` to `"saved"` (re-arming notification for any future error).
- Info notice auto-dismiss: after `showNotice` (e.g. via `openFile`) the notice is
  present, and after advancing `INFO_NOTICE_DISMISS_MS` it is `null`.
- An error notice does **not** auto-dismiss after the same interval.

**Component:**
- `__tests__/markdown-toolbar.test.tsx` (extend): given `saveStatus="saving"` the
  subtitle shows "Saving…"; given `"error"` it shows "Save failed".
- `__tests__/notice-message.test.tsx` (new): an error notice renders a
  `Dismiss notice` button that calls `onDismiss`; an info notice renders no dismiss
  button; the `role="status"` region is present even when `notice` is `null`.

**E2E (`tests/e2e/persistence.spec.ts`, new) — closes an audit gap:** load the app,
type a unique marker into the editor, wait for the indicator to read "Saved",
reload, and assert the marker is still in the editor and the indicator reads
"Saved".

## §5 — Delivery / PR packaging

Two PRs, each green on `check` + `e2e` before merge (squash; branch protection on
`master`). **Push, open PR, and merge are gated on explicit user approval.** PR B
branches from `master` after PR A merges.

- **PR A — Save status + persistence hardening:** `SaveStatus` + transitions and
  the two-effect persist in `useMarkdownDocument`; `classifyStorageError` /
  `describeSaveError` / `WriteResult` in `draft-storage.ts`; toolbar subtitle reads
  the status; lib + hook + toolbar tests; the persistence-across-reload E2E.
- **PR B — Notice lifecycle:** `useDismissibleNotice`; `NoticeMessage` wired into
  toolbar + footer with `clearNotice`; auto-dismiss + sticky/dismissible behavior;
  hook + component tests.

## Acceptance criteria

- After typing and pausing, the indicator transitions to "Saved"; it never sticks
  on "Draft"/"Unsaved" once a write succeeds. A failed write shows "Save failed".
- A `QuotaExceededError` produces the quota-specific message; a broken store shows
  the failure notice once, not once per keystroke; recovery clears it.
- Info notices disappear on their own after `INFO_NOTICE_DISMISS_MS`; error notices
  stay until dismissed via the `×` (which announces and is keyboard-reachable).
- A reload restores typed content and the indicator reads "Saved".
- `document.dirty` is no longer read by any component; the stored draft schema is
  unchanged (no version bump).
- `pnpm check` and `pnpm test:e2e` green for both PRs.
