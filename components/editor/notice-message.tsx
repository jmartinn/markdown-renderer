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
