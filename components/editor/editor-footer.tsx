import type { DocumentNotice } from "@/hooks/use-markdown-document"

interface EditorFooterProps {
  notice: DocumentNotice | null
}

export function EditorFooter({ notice }: EditorFooterProps) {
  return (
    <footer className="shrink-0 flex items-center justify-between gap-4 px-5 h-9 border-t border-[var(--md-border)] bg-[var(--md-surface)]">
      <span className="text-[11px] text-[var(--md-muted)] select-none" suppressHydrationWarning>
        &copy; {new Date().getFullYear()} Markdown Renderer
      </span>
      {notice ? (
        <span
          role="status"
          aria-live="polite"
          className={`min-w-0 flex-1 truncate text-center text-[11px] lg:hidden ${
            notice.type === "error" ? "text-[var(--md-danger)]" : "text-[var(--md-muted)]"
          }`}
        >
          {notice.message}
        </span>
      ) : null}
      <nav className="flex shrink-0 items-center gap-4" aria-label="Footer links">
        <a
          href="https://commonmark.org/help/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-[var(--md-muted)] hover:text-[var(--md-body)] transition-colors duration-150 rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-focus)]"
        >
          Syntax guide
        </a>
        <a
          href="https://github.com/jmartinn/markdown-renderer"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline text-[11px] text-[var(--md-muted)] hover:text-[var(--md-body)] transition-colors duration-150 rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-focus)]"
        >
          GitHub
        </a>
        <a
          href="https://jmartinn.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline text-[11px] text-[var(--md-muted)] hover:text-[var(--md-body)] transition-colors duration-150 rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-focus)]"
        >
          jmartinn.com
        </a>
      </nav>
    </footer>
  )
}
