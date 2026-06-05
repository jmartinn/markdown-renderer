"use client"

import dynamic from "next/dynamic"

import type { EditorView } from "@/components/editor/markdown-toolbar"

// The renderer pulls in react-markdown + remark + a curated lowlight/highlight.js
// grammar set. Load it as a separate chunk after the shell paints so the editor is
// interactive immediately instead of blocking on the markdown/highlight bundle.
const MarkdownRenderer = dynamic(
  () => import("@/components/markdown-renderer").then((m) => m.MarkdownRenderer),
  {
    ssr: false,
    loading: () => <p className="text-sm text-[var(--md-muted)]">Loading preview…</p>,
  }
)

interface PreviewPaneProps {
  content: string
  view: EditorView
  isStale: boolean
}

export function PreviewPane({ content, view, isStale }: PreviewPaneProps) {
  const isEmpty = content.trim().length === 0

  return (
    <section
      className={`flex flex-col ${
        view === "split" ? "w-full sm:w-1/2 h-1/2 sm:h-auto" : "w-full"
      } overflow-hidden`}
      aria-label="Rendered preview"
    >
      <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--md-border)] shrink-0">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--md-muted)]">
          Preview
        </span>
        {isStale ? (
          <span role="status" aria-live="polite" className="text-[11px] text-[var(--md-muted)]">
            Updating preview…
          </span>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 bg-[var(--md-preview-bg)]">
        {isEmpty ? (
          <div className="mx-auto flex h-full max-w-2xl items-center justify-center text-center">
            <p className="text-sm text-[var(--md-muted)]">
              Nothing to preview yet. Start writing Markdown in the editor.
            </p>
          </div>
        ) : (
          <div
            className={`max-w-2xl mx-auto transition-opacity duration-150 ${
              isStale ? "opacity-60" : "opacity-100"
            }`}
          >
            <MarkdownRenderer content={content} />
          </div>
        )}
      </div>
    </section>
  )
}
