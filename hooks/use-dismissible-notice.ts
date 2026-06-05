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
