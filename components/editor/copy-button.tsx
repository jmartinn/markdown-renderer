"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "absolute"
      textarea.style.left = "-9999px"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setCopied(true)
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy code"}
      className="flex items-center gap-1.5 text-[11px] font-mono font-medium transition-[color,transform] duration-150 active:scale-95
        text-[var(--md-code-copy)] hover:text-[var(--md-code-copy-hover)]"
    >
      <span
        key={copied ? "check" : "copy"}
        className="flex animate-in fade-in zoom-in-75 duration-150 ease-[var(--ease-out-cubic)]"
      >
        {copied ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 4V2.5A.5.5 0 0 0 7.5 2h-5A.5.5 0 0 0 2 2.5v5A.5.5 0 0 0 2.5 8H4" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        )}
      </span>
      {copied ? "Copied" : "Copy"}
    </button>
  )
}
