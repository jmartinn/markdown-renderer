"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"

import { downloadMarkdownDocument, MarkdownFileError, readMarkdownFile } from "@/lib/file-transfer"
import {
  classifyStorageError,
  describeSaveError,
  parseStoredDraft,
  serializeDraft,
  type StorageFailureReason,
} from "@/lib/draft-storage"
import {
  DRAFT_STORAGE_KEY,
  createSampleDocument,
  getDocumentCounts,
  getExportFileName,
  type MarkdownDocument,
} from "@/lib/markdown-document"
import { useDismissibleNotice } from "@/hooks/use-dismissible-notice"

export type DocumentNoticeType = "info" | "error"

export interface DocumentNotice {
  type: DocumentNoticeType
  message: string
}

export type SaveStatus = "saved" | "unsaved" | "saving" | "error"

interface UseMarkdownDocumentOptions {
  storage?: Storage | null
}

function resolveStorage(storage: Storage | null | undefined): Storage | null {
  if (storage !== undefined) return storage
  if (typeof window === "undefined") return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readDraft(storage: Storage | null): MarkdownDocument | null {
  if (!storage) return null

  try {
    return parseStoredDraft(storage.getItem(DRAFT_STORAGE_KEY))
  } catch {
    return null
  }
}

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

export function useMarkdownDocument(options: UseMarkdownDocumentOptions = {}) {
  const [document, setDocument] = useState<MarkdownDocument>(() => createSampleDocument())
  const { notice, showNotice, clearNotice } = useDismissibleNotice()
  const [draftReady, setDraftReady] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const notifiedSaveErrorRef = useRef(false)
  const storage = resolveStorage(options.storage)

  useEffect(() => {
    const restoredDocument = readDraft(storage)

    if (restoredDocument) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDocument(restoredDocument)
      showNotice({ type: "info", message: "Restored your last draft." })
    }

    setDraftReady(true)
  }, [storage, showNotice])

  const latestDocumentRef = useRef(document)
  useEffect(() => {
    latestDocumentRef.current = document
  }, [document])

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
        clearNotice()
      }
    } else {
      setSaveStatus("error")
      if (!notifiedSaveErrorRef.current) {
        notifiedSaveErrorRef.current = true
        showNotice({ type: "error", message: describeSaveError(result.reason) })
      }
    }
  }, [saveStatus, storage, showNotice, clearNotice])

  useEffect(() => {
    if (!draftReady || !storage) return

    // Flush the latest draft synchronously when the tab is hidden or unloaded so
    // a debounced write still in flight isn't lost when the user leaves.
    const flush = () => {
      writeDraft(storage, latestDocumentRef.current)
    }
    const handleVisibilityChange = () => {
      if (window.document.visibilityState === "hidden") flush()
    }

    window.addEventListener("pagehide", flush)
    window.document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("pagehide", flush)
      window.document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [draftReady, storage])

  // Counts are derived from a deferred copy of the content so the O(n) word
  // split never runs inside the keystroke commit — typing stays responsive on
  // large documents and the counts catch up a frame later. Correctness is
  // unchanged; only the timing is.
  const deferredContent = useDeferredValue(document.content)
  const counts = useMemo(() => getDocumentCounts(deferredContent), [deferredContent])
  const exportFileName = useMemo(
    () => getExportFileName({ fileName: document.fileName }),
    [document.fileName]
  )

  const updateContent = useCallback((content: string) => {
    setDocument((currentDocument) => ({
      ...currentDocument,
      content,
      dirty: true,
      source: "typed",
    }))
    setSaveStatus("unsaved")
  }, [])

  const openFile = useCallback(async (file: File | undefined): Promise<boolean> => {
    if (!file) return false

    try {
      const content = await readMarkdownFile(file)

      setDocument({
        content,
        fileName: file.name,
        dirty: false,
        lastLoadedAt: Date.now(),
        source: "uploaded",
      })
      setSaveStatus("unsaved")
      showNotice({ type: "info", message: `Opened ${file.name}.` })

      return true
    } catch (error) {
      const message =
        error instanceof MarkdownFileError
          ? error.message
          : `Could not read "${file.name}". Try a different Markdown or text file.`

      showNotice({ type: "error", message })
      return false
    }
  }, [showNotice])

  const exportDocument = useCallback(() => {
    const fileName = downloadMarkdownDocument(document)
    showNotice({ type: "info", message: `Exported ${fileName}.` })
  }, [document, showNotice])

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
}
