interface DragDropOverlayProps {
  isDragging: boolean
}

export function DragDropOverlay({ isDragging }: DragDropOverlayProps) {
  if (!isDragging) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-[var(--md-bg)]/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex flex-col items-center gap-2 px-10 py-8 rounded-[var(--md-radius)] border-2 border-dashed border-[var(--md-border-strong)] bg-[var(--md-surface)] animate-in zoom-in-95 duration-200 ease-[var(--ease-out-cubic)]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[var(--md-heading)]">
          <path d="M12 15V3M7.5 7.5 12 3l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="text-sm font-semibold text-[var(--md-heading)]">Drop to open</span>
        <span className="text-xs text-[var(--md-muted)]">Markdown or text file</span>
      </div>
    </div>
  )
}
