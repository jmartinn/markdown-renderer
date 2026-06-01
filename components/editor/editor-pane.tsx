import type { EditorView } from "@/components/editor/view-types"

interface EditorPaneProps {
  content: string
  view: EditorView
  onContentChange: (content: string) => void
}

export function EditorPane({ content, view, onContentChange }: EditorPaneProps) {
  return (
    <section
      className={`flex flex-col ${
        view === "split" ? "w-full sm:w-1/2 h-1/2 sm:h-auto border-b sm:border-b-0 sm:border-r border-[var(--md-border)]" : "w-full"
      } overflow-hidden`}
      aria-label="Markdown editor"
    >
      <div className="flex items-center px-4 h-9 border-b border-[var(--md-border)] shrink-0">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--md-muted)]">
          Source
        </span>
      </div>
      <textarea
        value={content}
        onChange={(event) => onContentChange(event.target.value)}
        spellCheck={false}
        className="flex-1 resize-none p-5 text-sm font-mono leading-relaxed bg-[var(--md-editor-bg)] text-[var(--md-editor-text)] placeholder:text-[var(--md-muted)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--md-border-strong)] selection:bg-[var(--md-selection)] overflow-auto"
        placeholder="Start writing Markdown…"
        aria-label="Markdown source editor"
      />
    </section>
  )
}
