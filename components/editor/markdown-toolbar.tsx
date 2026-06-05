import { useRef, type ChangeEvent, type KeyboardEvent } from "react"

export type EditorView = "editor" | "split" | "preview"

export const EDITOR_VIEWS: EditorView[] = ["editor", "split", "preview"]
import type { DocumentNotice, SaveStatus } from "@/hooks/use-markdown-document"
import type { MarkdownDocument } from "@/lib/markdown-document"
import { NoticeMessage } from "@/components/editor/notice-message"

const SAVE_STATUS_LABEL: Record<SaveStatus, string> = {
  saved: "Saved",
  unsaved: "Unsaved",
  saving: "Saving…",
  error: "Save failed",
}

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
  onClearNotice: () => void
}

export function MarkdownToolbar({
  view,
  document,
  wordCount,
  characterCount,
  notice,
  saveStatus,
  exportFileName,
  onViewChange,
  onOpenFile,
  onExport,
  onClearNotice,
}: MarkdownToolbarProps) {
  const activeIndex = EDITOR_VIEWS.indexOf(view)
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    onOpenFile(event.target.files?.[0])
    event.target.value = ""
  }

  // Roving arrow-key navigation for the radiogroup (Left/Up = previous, Right/Down = next).
  const handleViewKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % EDITOR_VIEWS.length
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + EDITOR_VIEWS.length) % EDITOR_VIEWS.length
    }
    if (nextIndex === null) return

    event.preventDefault()
    onViewChange(EDITOR_VIEWS[nextIndex])
    radioRefs.current[nextIndex]?.focus()
  }

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 h-12 border-b border-[var(--md-border)] bg-[var(--md-surface)] shrink-0 z-10">
      <div className="flex min-w-0 items-center gap-2.5">
        <svg width="18" height="18" viewBox="0 0 76 65" fill="var(--md-heading)" aria-hidden="true">
          <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
        </svg>
        <div className="min-w-0">
          <h1
            className="m-0 flex items-center gap-1.5 text-sm font-normal"
            aria-label="Markdown Renderer"
          >
            <span className="max-[359px]:hidden text-sm font-semibold tracking-tight text-[var(--md-heading)]">
              Markdown
            </span>
            <span className="hidden sm:inline text-sm text-[var(--md-muted)] font-normal">Renderer</span>
          </h1>
          <span
            className={`hidden md:block max-w-[12rem] truncate text-[11px] ${
              saveStatus === "error" ? "text-[var(--md-danger)]" : "text-[var(--md-muted)]"
            }`}
          >
            {SAVE_STATUS_LABEL[saveStatus]} · {document.fileName}
          </span>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label="Editor layout"
        className="relative grid grid-cols-3 bg-[var(--md-tab-bg)] rounded-[var(--md-radius-sm)] p-0.5"
      >
        <span
          aria-hidden="true"
          className="absolute top-0.5 bottom-0.5 left-0.5 rounded-[calc(var(--md-radius-sm)-2px)] bg-[var(--md-tab-active)] shadow-sm transition-transform duration-200 ease-[var(--ease-in-out-cubic)]"
          style={{
            width: "calc((100% - 0.25rem) / 3)",
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
        {EDITOR_VIEWS.map((candidateView, index) => (
          <button
            key={candidateView}
            ref={(element) => {
              radioRefs.current[index] = element
            }}
            type="button"
            role="radio"
            onClick={() => onViewChange(candidateView)}
            onKeyDown={(event) => handleViewKeyDown(event, index)}
            aria-checked={view === candidateView}
            tabIndex={view === candidateView ? 0 : -1}
            className={`relative z-10 cursor-pointer px-2 sm:px-3 py-1 text-center text-xs font-medium capitalize transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-focus)] rounded-[calc(var(--md-radius-sm)-2px)] ${
              view === candidateView
                ? "text-[var(--md-tab-active-text)]"
                : "text-[var(--md-muted)] hover:text-[var(--md-body)]"
            }`}
          >
            {candidateView}
          </button>
        ))}
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2">
        <div className="hidden lg:flex min-w-0 flex-col items-end">
          <span className="text-xs text-[var(--md-muted)] tabular-nums">
            {wordCount.toLocaleString()} words · {characterCount.toLocaleString()} chars
          </span>
          <NoticeMessage
            notice={notice}
            onDismiss={onClearNotice}
            className="max-w-[18rem] text-[11px]"
          />
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".md,.markdown,.txt"
            aria-label="Open file"
            className="peer sr-only"
            onChange={handleFileUpload}
          />
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--md-radius-sm)] border border-[var(--md-border)] bg-[var(--md-surface)] text-[var(--md-body)] hover:bg-[var(--md-hover)] transition-[background-color,color,transform] duration-150 active:scale-[0.97] cursor-pointer select-none peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--md-focus)]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 8V1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M3.5 3.5L6 1l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 10.5h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline">Open file</span>
          </span>
        </label>
        <button
          type="button"
          onClick={onExport}
          aria-label={`Export ${exportFileName}`}
          className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--md-radius-sm)] bg-[var(--md-btn-bg)] text-[var(--md-btn-text)] hover:bg-[var(--md-btn-hover)] transition-[background-color,color,transform] duration-150 active:scale-[0.97] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--md-surface)]"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 1v7M3.5 4.5L6 7l2.5-2.5M2 9.5h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </header>
  )
}
