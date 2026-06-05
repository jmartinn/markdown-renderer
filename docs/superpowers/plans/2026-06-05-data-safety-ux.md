# Data-safety / UX Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the editor an honest save-status indicator, auto-dismissing info notices with sticky/dismissible errors, and quota-aware draft persistence.

**Architecture:** A `saveStatus` state machine in `useMarkdownDocument` (driven by a debounce-schedule effect + a follow-up write effect, so "Saving…" paints honestly); pure quota helpers in `lib/draft-storage.ts`; a focused `useDismissibleNotice` hook and a shared `NoticeMessage` component for the notice lifecycle. `useMarkdownDocument` stays the coordinator.

**Tech Stack:** Next.js 16 / React 19, TypeScript, Tailwind v4, Vitest + @testing-library/react (jsdom, plain assertions — no jest-dom), Playwright (Chromium, production build).

**Reference spec:** `docs/superpowers/specs/2026-06-05-data-safety-ux-design.md`

**Delivery:** Two PRs. **PR A** = save-status + persistence hardening (Tasks A1–A6). **PR B** = notice lifecycle (Tasks B1–B6). PR B branches from `master` *after* PR A merges. Each PR must be green on `check` + `e2e`. **Push, open PR, and merge are gated on explicit user approval** (branch protection on `master`; squash-merge).

---

## File Structure

**PR A:**
- `lib/draft-storage.ts` (modify) — add `StorageFailureReason`, `classifyStorageError`, `describeSaveError`.
- `hooks/use-markdown-document.ts` (modify) — `SaveStatus` type, `WriteResult` return from `writeDraft`, `saveStatus` state, schedule + write effects, quota-aware once-per-failure notice.
- `components/editor/markdown-toolbar.tsx` (modify) — `saveStatus` prop + status-driven subtitle.
- `components/markdown-editor.tsx` (modify) — pass `saveStatus` to the toolbar.
- `__tests__/draft-storage.test.ts` (modify) — classify/describe tests.
- `__tests__/use-markdown-document.test.tsx` (modify) — status-transition + quota-once-recovery tests.
- `__tests__/markdown-toolbar.test.tsx` (modify) — status-label tests + existing test gets the new prop.
- `tests/e2e/persistence.spec.ts` (create) — persistence-across-reload.
- `CLAUDE.md` (modify) — document the save-status model.

**PR B:**
- `hooks/use-dismissible-notice.ts` (create) — notice + auto-dismiss timer.
- `hooks/use-markdown-document.ts` (modify) — consume `useDismissibleNotice`.
- `components/editor/notice-message.tsx` (create) — shared live-region banner with dismiss.
- `components/editor/markdown-toolbar.tsx` (modify) — render `NoticeMessage`.
- `components/editor/editor-footer.tsx` (modify) — render `NoticeMessage`.
- `components/markdown-editor.tsx` (modify) — pass `clearNotice` to toolbar + footer.
- `__tests__/use-dismissible-notice.test.tsx` (create) — auto-dismiss / sticky tests.
- `__tests__/notice-message.test.tsx` (create) — dismiss-button behavior.
- `CLAUDE.md` (modify) — document the notice lifecycle.

---

# PR A — Save status + persistence hardening

### Task A1: Branch and commit the spec + this plan

**Files:**
- Commit: `docs/superpowers/specs/2026-06-05-data-safety-ux-design.md`, `docs/superpowers/plans/2026-06-05-data-safety-ux.md`

- [ ] **Step 1: Create the feature branch**

Run:
```bash
git checkout -b data-safety/save-status
```

- [ ] **Step 2: Commit the design docs**

```bash
git add docs/superpowers/specs/2026-06-05-data-safety-ux-design.md docs/superpowers/plans/2026-06-05-data-safety-ux.md
git commit -m "docs: add data-safety/UX spec and plan"
```

---

### Task A2: Quota classification helpers (pure)

**Files:**
- Modify: `lib/draft-storage.ts`
- Test: `__tests__/draft-storage.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/draft-storage.test.ts`. Update the top import to add the two new helpers:

```ts
import {
  classifyStorageError,
  describeSaveError,
  parseStoredDraft,
  serializeDraft,
} from '@/lib/draft-storage'
```

Then add this `describe` block after the existing one:

```ts
describe('storage failure classification', () => {
  it('classifies a QuotaExceededError by name', () => {
    expect(classifyStorageError(new DOMException('nope', 'QuotaExceededError'))).toBe('quota')
  })

  it('classifies a quota error by its legacy numeric code', () => {
    const error = new DOMException('nope')
    Object.defineProperty(error, 'code', { value: 22 })
    expect(classifyStorageError(error)).toBe('quota')
  })

  it('treats any other error as unknown', () => {
    expect(classifyStorageError(new Error('boom'))).toBe('unknown')
    expect(classifyStorageError('not even an error')).toBe('unknown')
  })

  it('maps each reason to its message', () => {
    expect(describeSaveError('quota')).toBe('Your draft is too large to save in this browser.')
    expect(describeSaveError('unknown')).toBe('Draft changes could not be saved in this browser.')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- draft-storage`
Expected: FAIL — `classifyStorageError`/`describeSaveError` are not exported.

- [ ] **Step 3: Implement the helpers**

Add to the top of `lib/draft-storage.ts`, after the existing imports:

```ts
export type StorageFailureReason = "quota" | "unknown"

const QUOTA_ERROR_NAMES = ["QuotaExceededError", "NS_ERROR_DOM_QUOTA_REACHED"]

/** Identify a localStorage write that failed because the store is full. */
export function classifyStorageError(error: unknown): StorageFailureReason {
  if (error instanceof DOMException) {
    if (QUOTA_ERROR_NAMES.includes(error.name) || error.code === 22 || error.code === 1014) {
      return "quota"
    }
  }
  return "unknown"
}

/** Human-readable copy for a save failure. */
export function describeSaveError(reason: StorageFailureReason): string {
  if (reason === "quota") return "Your draft is too large to save in this browser."
  return "Draft changes could not be saved in this browser."
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- draft-storage`
Expected: PASS (all draft-storage tests green).

- [ ] **Step 5: Commit**

```bash
git add lib/draft-storage.ts __tests__/draft-storage.test.ts
git commit -m "feat(lib): classify storage quota failures"
```

---

### Task A3: Save-status state machine in the hook

**Files:**
- Modify: `hooks/use-markdown-document.ts`
- Test: `__tests__/use-markdown-document.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append these two tests inside the existing `describe('useMarkdownDocument', …)` block in `__tests__/use-markdown-document.test.tsx`:

```ts
it('transitions saveStatus from unsaved to saved after the debounce', () => {
  vi.useFakeTimers()
  try {
    const { result } = renderHook(() => useMarkdownDocument({ storage: localStorage }))

    act(() => {
      result.current.updateContent('# Saved please')
    })
    expect(result.current.saveStatus).toBe('unsaved')

    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current.saveStatus).toBe('saved')
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toContain('# Saved please')
  } finally {
    vi.useRealTimers()
  }
})

it('reports a quota failure once, then recovers on the next successful save', () => {
  vi.useFakeTimers()
  try {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const { result } = renderHook(() => useMarkdownDocument({ storage: localStorage }))

    act(() => {
      result.current.updateContent('# One')
    })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current.saveStatus).toBe('error')
    expect(result.current.notice?.message).toBe('Your draft is too large to save in this browser.')

    // Dismiss the notice; a second failing cycle must not re-show it.
    act(() => {
      result.current.clearNotice()
    })
    act(() => {
      result.current.updateContent('# Two')
    })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current.saveStatus).toBe('error')
    expect(result.current.notice).toBeNull()

    // Storage recovers: the next save succeeds.
    setItem.mockRestore()
    act(() => {
      result.current.updateContent('# Three')
    })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current.saveStatus).toBe('saved')
  } finally {
    vi.useRealTimers()
  }
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- use-markdown-document`
Expected: FAIL — `result.current.saveStatus` is `undefined`.

- [ ] **Step 3: Add the `SaveStatus` type and `WriteResult`**

In `hooks/use-markdown-document.ts`, update the `draft-storage` import to pull in the new helpers and type:

```ts
import {
  classifyStorageError,
  describeSaveError,
  parseStoredDraft,
  serializeDraft,
  type StorageFailureReason,
} from "@/lib/draft-storage"
```

Add the exported type next to `DocumentNotice` (after the `DocumentNotice` interface, ~line 20):

```ts
export type SaveStatus = "saved" | "unsaved" | "saving" | "error"
```

Replace the existing `writeDraft` helper (currently returns `boolean`) with:

```ts
type WriteResult = { ok: true } | { ok: false; reason: StorageFailureReason }

function writeDraft(storage: Storage | null, document: MarkdownDocument): WriteResult {
  if (!storage) return { ok: true }

  try {
    storage.setItem(DRAFT_STORAGE_KEY, serializeDraft(document))
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: classifyStorageError(error) }
  }
}
```

- [ ] **Step 4: Add status state and rewrite the persist effects**

Inside `useMarkdownDocument`, add state next to the existing `useState`/`useRef` declarations (after `const [draftReady, setDraftReady] = useState(false)`):

```ts
const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
const notifiedSaveErrorRef = useRef(false)
```

Add `setSaveStatus("unsaved")` to `updateContent`:

```ts
const updateContent = useCallback((content: string) => {
  setDocument((currentDocument) => ({
    ...currentDocument,
    content,
    dirty: true,
    source: "typed",
  }))
  setSaveStatus("unsaved")
}, [])
```

Add `setSaveStatus("unsaved")` to the success branch of `openFile`, right after the `setDocument({ … source: "uploaded" })` call and before `setNotice(...)`:

```ts
      setDocument({
        content,
        fileName: file.name,
        dirty: false,
        lastLoadedAt: Date.now(),
        source: "uploaded",
      })
      setSaveStatus("unsaved")
      setNotice({ type: "info", message: `Opened ${file.name}.` })
```

Now **replace** the existing debounce effect (the `useEffect` whose comment begins "Debounce so large documents…", currently ~lines 81–96) with these two effects:

```ts
  // Schedule a debounced save whenever the user-authored document changes. The
  // sample and a freshly-restored draft already live in their canonical place, so
  // they schedule nothing — which also avoids a startup "Saving…" flash.
  useEffect(() => {
    if (!draftReady) return
    if (document.source === "sample" || document.source === "restored") return

    const timer = setTimeout(() => setSaveStatus("saving"), 400)
    return () => clearTimeout(timer)
  }, [document, draftReady])

  // Perform the write once "Saving…" has committed. Running it in a follow-up
  // effect (after React commits and the browser paints) makes the transient status
  // honestly visible without manual requestAnimationFrame bookkeeping.
  useEffect(() => {
    if (saveStatus !== "saving") return

    const result = writeDraft(storage, latestDocumentRef.current)
    if (result.ok) {
      setSaveStatus("saved")
      if (notifiedSaveErrorRef.current) {
        notifiedSaveErrorRef.current = false
        setNotice(null)
      }
    } else {
      setSaveStatus("error")
      if (!notifiedSaveErrorRef.current) {
        notifiedSaveErrorRef.current = true
        setNotice({ type: "error", message: describeSaveError(result.reason) })
      }
    }
  }, [saveStatus, storage])
```

Finally, add `saveStatus` to the returned object:

```ts
  return {
    document,
    counts,
    notice,
    saveStatus,
    exportFileName,
    draftReady,
    updateContent,
    openFile,
    exportDocument,
    clearNotice,
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test -- use-markdown-document`
Expected: PASS — all existing tests plus the two new ones.

- [ ] **Step 6: Run lint to confirm no dependency warnings**

Run: `pnpm lint`
Expected: PASS. (The schedule effect reads `document.source` + `draftReady`; the write effect reads `saveStatus` + `storage` — both dependency arrays are exhaustive.)

- [ ] **Step 7: Commit**

```bash
git add hooks/use-markdown-document.ts __tests__/use-markdown-document.test.tsx
git commit -m "feat(hook): add save-status state machine with quota-aware persistence"
```

---

### Task A4: Status-driven toolbar subtitle

**Files:**
- Modify: `components/editor/markdown-toolbar.tsx`
- Modify: `components/markdown-editor.tsx`
- Test: `__tests__/markdown-toolbar.test.tsx`

- [ ] **Step 1: Update the existing test and add status-label tests**

In `__tests__/markdown-toolbar.test.tsx`, add `saveStatus="saved"` to the props in the existing `render(...)` call (so it still compiles once the prop is required), then add these two tests inside the `describe`:

```ts
it("shows the saving label in the subtitle", () => {
  const noop = () => {}
  render(
    <MarkdownToolbar
      view="split"
      document={createSampleDocument(0)}
      wordCount={3}
      characterCount={13}
      notice={null}
      saveStatus="saving"
      exportFileName="document.md"
      onViewChange={noop}
      onOpenFile={noop}
      onExport={noop}
    />
  )

  expect(screen.getByText("Saving… · document.md")).toBeTruthy()
})

it("shows the save-failed label in the subtitle", () => {
  const noop = () => {}
  render(
    <MarkdownToolbar
      view="split"
      document={createSampleDocument(0)}
      wordCount={3}
      characterCount={13}
      notice={null}
      saveStatus="error"
      exportFileName="document.md"
      onViewChange={noop}
      onOpenFile={noop}
      onExport={noop}
    />
  )

  expect(screen.getByText("Save failed · document.md")).toBeTruthy()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- markdown-toolbar`
Expected: FAIL — type error / `saveStatus` not a prop, and the subtitle still renders "Loaded: document.md".

- [ ] **Step 3: Add the prop and the status-driven subtitle**

In `components/editor/markdown-toolbar.tsx`, import the type and add a label map. Update the type import line:

```ts
import type { DocumentNotice, SaveStatus } from "@/hooks/use-markdown-document"
```

Add this constant above the `MarkdownToolbarProps` interface:

```ts
const SAVE_STATUS_LABEL: Record<SaveStatus, string> = {
  saved: "Saved",
  unsaved: "Unsaved",
  saving: "Saving…",
  error: "Save failed",
}
```

Add `saveStatus` to `MarkdownToolbarProps`:

```ts
interface MarkdownToolbarProps {
  view: EditorView
  document: MarkdownDocument
  wordCount: number
  characterCount: number
  notice: DocumentNotice | null
  saveStatus: SaveStatus
  exportFileName: string
  onViewChange: (view: EditorView) => void
  onOpenFile: (file: File | undefined) => void
  onExport: () => void
}
```

Destructure it in the component signature (add `saveStatus,` to the params), then replace the subtitle `<span>` (currently `{document.dirty ? "Draft" : "Loaded"}: {document.fileName}`):

```tsx
          <span
            className={`hidden md:block max-w-[12rem] truncate text-[11px] ${
              saveStatus === "error" ? "text-[var(--md-danger)]" : "text-[var(--md-muted)]"
            }`}
          >
            {SAVE_STATUS_LABEL[saveStatus]} · {document.fileName}
          </span>
```

- [ ] **Step 4: Pass `saveStatus` from the editor**

In `components/markdown-editor.tsx`, destructure `saveStatus` from the hook:

```ts
  const {
    document,
    counts,
    notice,
    saveStatus,
    exportFileName,
    updateContent,
    openFile,
    exportDocument,
  } = useMarkdownDocument()
```

Pass it to `<MarkdownToolbar>` (add `saveStatus={saveStatus}` alongside the existing props):

```tsx
      <MarkdownToolbar
        view={view}
        document={document}
        wordCount={counts.words}
        characterCount={counts.characters}
        notice={notice}
        saveStatus={saveStatus}
        exportFileName={exportFileName}
        onViewChange={setView}
        onOpenFile={handleOpenFile}
        onExport={exportDocument}
      />
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test -- markdown-toolbar`
Expected: PASS (existing h1 test + the two label tests).

- [ ] **Step 6: Commit**

```bash
git add components/editor/markdown-toolbar.tsx components/markdown-editor.tsx __tests__/markdown-toolbar.test.tsx
git commit -m "feat(editor): show save status in the toolbar subtitle"
```

---

### Task A5: Persistence-across-reload E2E

**Files:**
- Create: `tests/e2e/persistence.spec.ts`

- [ ] **Step 1: Write the E2E test**

Create `tests/e2e/persistence.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the E2E test to verify it passes**

Run: `pnpm test:e2e -- persistence`
Expected: PASS. (Playwright builds + serves production; first run is slow.)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/persistence.spec.ts
git commit -m "test(e2e): verify drafts survive a reload"
```

---

### Task A6: Document the save-status model

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add a note under "Conventions & gotchas"**

In `CLAUDE.md`, add this bullet to the "Conventions & gotchas" list:

```markdown
- Save state lives in `useMarkdownDocument` as a `saveStatus` enum (`saved | unsaved | saving | error`), surfaced in the toolbar subtitle. It is driven by two effects: a debounce-**schedule** effect (skips `source: "sample" | "restored"`, so the canonical/just-restored doc doesn't re-write or flash "Saving…") and a follow-up **write** effect that runs after the "Saving…" commit paints. `document.dirty` is now **vestigial** — retained in the persisted v1 schema but read by nothing; `saveStatus` is authoritative. Don't rewire the UI to `dirty`.
```

- [ ] **Step 2: Verify the full gate passes**

Run: `pnpm check`
Expected: PASS (lint, typecheck, test, build, audit).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document the save-status model"
```

**PR A is complete.** Hand back to the controller for the user-approved push / PR / merge.

---

# PR B — Notice lifecycle

> Branch from `master` **after PR A is merged** so this builds on the shipped save-status work.

### Task B1: Branch for the notice work

- [ ] **Step 1: Sync master and branch**

Run:
```bash
git checkout master
git pull --ff-only
git checkout -b data-safety/notices
```

---

### Task B2: `useDismissibleNotice` hook

**Files:**
- Create: `hooks/use-dismissible-notice.ts`
- Test: `__tests__/use-dismissible-notice.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/use-dismissible-notice.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { INFO_NOTICE_DISMISS_MS, useDismissibleNotice } from "@/hooks/use-dismissible-notice"

describe("useDismissibleNotice", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("auto-dismisses info notices after the delay", () => {
    const { result } = renderHook(() => useDismissibleNotice())

    act(() => {
      result.current.showNotice({ type: "info", message: "Opened notes.md." })
    })
    expect(result.current.notice?.message).toBe("Opened notes.md.")

    act(() => {
      vi.advanceTimersByTime(INFO_NOTICE_DISMISS_MS)
    })
    expect(result.current.notice).toBeNull()
  })

  it("keeps error notices until cleared", () => {
    const { result } = renderHook(() => useDismissibleNotice())

    act(() => {
      result.current.showNotice({ type: "error", message: "Save failed" })
    })
    act(() => {
      vi.advanceTimersByTime(INFO_NOTICE_DISMISS_MS * 2)
    })
    expect(result.current.notice?.message).toBe("Save failed")

    act(() => {
      result.current.clearNotice()
    })
    expect(result.current.notice).toBeNull()
  })

  it("replacing a notice cancels the previous auto-dismiss timer", () => {
    const { result } = renderHook(() => useDismissibleNotice())

    act(() => {
      result.current.showNotice({ type: "info", message: "First" })
    })
    act(() => {
      vi.advanceTimersByTime(INFO_NOTICE_DISMISS_MS - 1)
      result.current.showNotice({ type: "error", message: "Second" })
    })
    // The first timer would have fired here; it must not clear the error.
    act(() => {
      vi.advanceTimersByTime(INFO_NOTICE_DISMISS_MS)
    })
    expect(result.current.notice?.message).toBe("Second")
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- use-dismissible-notice`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the hook**

Create `hooks/use-dismissible-notice.ts`:

```ts
"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { DocumentNotice } from "@/hooks/use-markdown-document"

export const INFO_NOTICE_DISMISS_MS = 5000

/**
 * Owns a single transient notice. Info notices auto-dismiss after
 * INFO_NOTICE_DISMISS_MS; error notices stay until cleared explicitly.
 */
export function useDismissibleNotice() {
  const [notice, setNotice] = useState<DocumentNotice | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const clearNotice = useCallback(() => {
    clearTimer()
    setNotice(null)
  }, [clearTimer])

  const showNotice = useCallback(
    (next: DocumentNotice) => {
      clearTimer()
      setNotice(next)
      if (next.type === "info") {
        timerRef.current = setTimeout(() => {
          timerRef.current = null
          setNotice(null)
        }, INFO_NOTICE_DISMISS_MS)
      }
    },
    [clearTimer]
  )

  useEffect(() => clearTimer, [clearTimer])

  return { notice, showNotice, clearNotice }
}
```

(`DocumentNotice` is imported type-only; `use-markdown-document` imports this hook's value at runtime, so the type-only direction creates no runtime cycle.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- use-dismissible-notice`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add hooks/use-dismissible-notice.ts __tests__/use-dismissible-notice.test.tsx
git commit -m "feat(hook): add dismissible-notice hook with auto-dismiss"
```

---

### Task B3: Consume `useDismissibleNotice` in the document hook

**Files:**
- Modify: `hooks/use-markdown-document.ts`
- Test: `__tests__/use-markdown-document.test.tsx` (existing tests guard this refactor)

- [ ] **Step 1: Swap the notice state for the hook**

In `hooks/use-markdown-document.ts`, add the import:

```ts
import { useDismissibleNotice } from "@/hooks/use-dismissible-notice"
```

Replace the notice `useState` and the standalone `clearNotice` callback. Remove these lines:

```ts
const [notice, setNotice] = useState<DocumentNotice | null>(null)
```

and the existing:

```ts
const clearNotice = useCallback(() => {
  setNotice(null)
}, [])
```

Add, alongside the other state declarations:

```ts
const { notice, showNotice, clearNotice } = useDismissibleNotice()
```

- [ ] **Step 2: Replace every `setNotice(...)` call**

Replace the notice calls as follows:
- Restore effect: `setNotice({ type: "info", message: "Restored your last draft." })` → `showNotice({ type: "info", message: "Restored your last draft." })`
- `openFile` success: `setNotice({ type: "info", message: \`Opened ${file.name}.\` })` → `showNotice(...)` (same payload)
- `openFile` failure: `setNotice({ type: "error", message })` → `showNotice({ type: "error", message })`
- `exportDocument`: `setNotice({ type: "info", message: \`Exported ${fileName}.\` })` → `showNotice(...)` (same payload)
- Write effect recovery: `setNotice(null)` → `clearNotice()`
- Write effect failure: `setNotice({ type: "error", message: describeSaveError(result.reason) })` → `showNotice({ type: "error", message: describeSaveError(result.reason) })`

Update the write effect's dependency array to include the two callbacks:

```ts
  }, [saveStatus, storage, showNotice, clearNotice])
```

- [ ] **Step 3: Run the hook tests and lint**

Run: `pnpm test -- use-markdown-document && pnpm lint`
Expected: PASS — existing notice assertions (set synchronously, no timer advance) still hold; lint clean. (The restore effect keeps its existing `// eslint-disable-next-line react-hooks/set-state-in-effect` on the `setDocument` line; `showNotice` is a callback, not a direct setState, so it needs no disable.)

- [ ] **Step 4: Commit**

```bash
git add hooks/use-markdown-document.ts
git commit -m "refactor(hook): route notices through useDismissibleNotice"
```

---

### Task B4: `NoticeMessage` component

**Files:**
- Create: `components/editor/notice-message.tsx`
- Test: `__tests__/notice-message.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/notice-message.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { NoticeMessage } from "@/components/editor/notice-message"

describe("NoticeMessage", () => {
  it("keeps a live region in the DOM even with no notice", () => {
    render(<NoticeMessage notice={null} onDismiss={() => {}} />)
    expect(screen.getByRole("status")).toBeTruthy()
  })

  it("renders an error notice with a dismiss button that calls onDismiss", () => {
    const onDismiss = vi.fn()
    render(
      <NoticeMessage notice={{ type: "error", message: "Save failed" }} onDismiss={onDismiss} />
    )

    expect(screen.getByText("Save failed")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notice" }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it("does not render a dismiss button for info notices", () => {
    render(<NoticeMessage notice={{ type: "info", message: "Opened notes.md." }} onDismiss={() => {}} />)
    expect(screen.queryByRole("button", { name: "Dismiss notice" })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- notice-message`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the component**

Create `components/editor/notice-message.tsx`:

```tsx
import type { DocumentNotice } from "@/hooks/use-markdown-document"

interface NoticeMessageProps {
  notice: DocumentNotice | null
  onDismiss: () => void
  className?: string
}

/**
 * A polite live region for transient notices. The region is always present so
 * announcements fire reliably; the message and (for errors) the dismiss control
 * render only when there's a notice. An empty region collapses to zero height.
 */
export function NoticeMessage({ notice, onDismiss, className }: NoticeMessageProps) {
  return (
    <div role="status" aria-live="polite" className={className}>
      {notice ? (
        <span
          className={`inline-flex max-w-full items-center gap-1 ${
            notice.type === "error" ? "text-[var(--md-danger)]" : "text-[var(--md-muted)]"
          }`}
        >
          <span className="min-w-0 truncate">{notice.message}</span>
          {notice.type === "error" ? (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss notice"
              className="shrink-0 rounded-[2px] px-0.5 leading-none hover:text-[var(--md-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-focus)]"
            >
              ×
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- notice-message`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/editor/notice-message.tsx __tests__/notice-message.test.tsx
git commit -m "feat(editor): add shared NoticeMessage with dismiss control"
```

---

### Task B5: Wire `NoticeMessage` into the toolbar and footer

**Files:**
- Modify: `components/editor/markdown-toolbar.tsx`
- Modify: `components/editor/editor-footer.tsx`
- Modify: `components/markdown-editor.tsx`
- Modify: `__tests__/markdown-toolbar.test.tsx` (the new required prop)

- [ ] **Step 1: Toolbar — replace the inline notice span**

In `components/editor/markdown-toolbar.tsx`, add the import:

```ts
import { NoticeMessage } from "@/components/editor/notice-message"
```

Add an `onClearNotice: () => void` field to `MarkdownToolbarProps` (after `onExport`):

```ts
  onExport: () => void
  onClearNotice: () => void
```

Destructure `onClearNotice` in the component params. Replace the inline notice block (the `{notice ? ( <span role="status" … >{notice.message}</span> ) : null}` inside the counts column) with:

```tsx
          <NoticeMessage
            notice={notice}
            onDismiss={onClearNotice}
            className="max-w-[18rem] text-[11px]"
          />
```

- [ ] **Step 2: Footer — replace the inline notice span**

In `components/editor/editor-footer.tsx`, add the import and an `onClearNotice` prop:

```ts
import { NoticeMessage } from "@/components/editor/notice-message"
import type { DocumentNotice } from "@/hooks/use-markdown-document"

interface EditorFooterProps {
  notice: DocumentNotice | null
  onClearNotice: () => void
}

export function EditorFooter({ notice, onClearNotice }: EditorFooterProps) {
```

Replace the inline notice block (the `{notice ? ( <span role="status" … /> ) : null}`) with:

```tsx
      <NoticeMessage
        notice={notice}
        onDismiss={onClearNotice}
        className="min-w-0 flex-1 truncate text-center text-[11px] lg:hidden"
      />
```

- [ ] **Step 3: Toolbar tests — pass the new required prop**

`onClearNotice` is now required, so each of the three `render(<MarkdownToolbar … />)` calls in `__tests__/markdown-toolbar.test.tsx` must pass it. Add `onClearNotice={noop}` next to the other handler props in every render (the first test already has a `const noop = () => {}`; reuse the same pattern in the other two).

- [ ] **Step 4: Editor — pass `clearNotice` to both**

In `components/markdown-editor.tsx`, destructure `clearNotice` from the hook (add it to the existing destructure):

```ts
  const {
    document,
    counts,
    notice,
    saveStatus,
    exportFileName,
    updateContent,
    openFile,
    exportDocument,
    clearNotice,
  } = useMarkdownDocument()
```

Pass `onClearNotice={clearNotice}` to `<MarkdownToolbar>` (alongside its other props) and to `<EditorFooter>`:

```tsx
      <EditorFooter notice={notice} onClearNotice={clearNotice} />
```

- [ ] **Step 5: Run the full gate**

Run: `pnpm check`
Expected: PASS. (The existing toolbar h1/label tests and all hook tests still pass; the empty always-present live region adds no layout shift — an empty block is zero-height, and the footer's `flex-1` slot already sat between copyright and nav.)

- [ ] **Step 6: Run the E2E suite**

Run: `pnpm test:e2e`
Expected: PASS (skip-link, copy, and persistence specs all green).

- [ ] **Step 7: Commit**

```bash
git add components/editor/markdown-toolbar.tsx components/editor/editor-footer.tsx components/markdown-editor.tsx
git commit -m "feat(editor): render dismissible notices in toolbar and footer"
```

---

### Task B6: Document the notice lifecycle

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add a note under "Conventions & gotchas"**

In `CLAUDE.md`, add this bullet:

```markdown
- Notices flow through `useDismissibleNotice` (`hooks/use-dismissible-notice.ts`): info notices auto-dismiss after `INFO_NOTICE_DISMISS_MS` (5 s); errors are sticky and cleared via the `×` in `NoticeMessage`. `NoticeMessage` (`components/editor/notice-message.tsx`) is the single notice renderer used by both the toolbar and the footer; its `role="status"` live region is **always** in the DOM (empty when idle) so announcements fire reliably — don't make it conditional.
```

- [ ] **Step 2: Verify the full gate**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document the notice lifecycle"
```

**PR B is complete.** Hand back to the controller for the user-approved push / PR / merge.

---

## Self-Review notes (for the executor)

- **Spec coverage:** §1 → A3/A4; §2 → B2/B3/B4/B5; §3 → A2/A3; §4 → A2 (lib), A3 (hook), A4 (component), A5 (E2E), B2/B4 (notice tests); §5 → PR split + the per-PR "hand back" gates.
- **Type consistency:** `SaveStatus` (hook) is used by `markdown-toolbar`; `StorageFailureReason`/`classifyStorageError`/`describeSaveError` (lib) are used by the hook; `WriteResult` is hook-local; `DocumentNotice` is imported type-only by `use-dismissible-notice` and `notice-message`; `INFO_NOTICE_DISMISS_MS` is exported for the test. `onClearNotice` is the toolbar/footer prop name; `clearNotice` is the hook's return.
- **Ordering:** A3 must land before A4 (toolbar needs `saveStatus`/`SaveStatus`). B2 before B3 (hook consumes it); B4 before B5 (UI renders it). PR B branches only after PR A merges.
