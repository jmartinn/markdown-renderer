"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { downloadMarkdownDocument, MarkdownFileError, readMarkdownFile } from "@/lib/file-transfer"
import { parseStoredDraft, serializeDraft } from "@/lib/draft-storage"
import {
  DRAFT_STORAGE_KEY,
  createSampleDocument,
  getDocumentCounts,
  getExportFileName,
  type MarkdownDocument,
} from "@/lib/markdown-document"

export type DocumentNoticeType = "info" | "error"

export interface DocumentNotice {
  type: DocumentNoticeType
  message: string
}

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

function writeDraft(storage: Storage | null, document: MarkdownDocument): boolean {
  if (!storage) return false

  try {
    storage.setItem(DRAFT_STORAGE_KEY, serializeDraft(document))
    return true
  } catch {
    return false
  }
}

export function useMarkdownDocument(options: UseMarkdownDocumentOptions = {}) {
  const [document, setDocument] = useState<MarkdownDocument>(() => createSampleDocument())
  const [notice, setNotice] = useState<DocumentNotice | null>(null)
  const [draftReady, setDraftReady] = useState(false)
  const storage = resolveStorage(options.storage)

  useEffect(() => {
    const restoredDocument = readDraft(storage)

    if (restoredDocument) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDocument(restoredDocument)
      setNotice({ type: "info", message: "Restored your last draft." })
    }

    setDraftReady(true)
  }, [storage])

  const latestDocumentRef = useRef(document)
  useEffect(() => {
    latestDocumentRef.current = document
  }, [document])

  useEffect(() => {
    if (!draftReady) return

    // Debounce so large documents aren't re-serialized to localStorage on every
    // keystroke — a synchronous setItem of a big string janks typing. Persist
    // once typing settles. (setNotice runs in the timeout, not synchronously in
    // the effect, so it doesn't trip react-hooks/set-state-in-effect.)
    const timer = setTimeout(() => {
      const persisted = writeDraft(storage, document)
      if (!persisted && storage) {
        setNotice({ type: "error", message: "Draft changes could not be saved in this browser." })
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [document, draftReady, storage])

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

  const counts = useMemo(() => getDocumentCounts(document.content), [document.content])
  const exportFileName = useMemo(() => getExportFileName(document), [document])

  const updateContent = useCallback((content: string) => {
    setDocument((currentDocument) => ({
      ...currentDocument,
      content,
      dirty: true,
      source: "typed",
    }))
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
      setNotice({ type: "info", message: `Opened ${file.name}.` })

      return true
    } catch (error) {
      const message =
        error instanceof MarkdownFileError
          ? error.message
          : `Could not read "${file.name}". Try a different Markdown or text file.`

      setNotice({ type: "error", message })
      return false
    }
  }, [])

  const exportDocument = useCallback(() => {
    const fileName = downloadMarkdownDocument(document)
    setNotice({ type: "info", message: `Exported ${fileName}.` })
  }, [document])

  const clearNotice = useCallback(() => {
    setNotice(null)
  }, [])

  return {
    document,
    counts,
    notice,
    exportFileName,
    draftReady,
    updateContent,
    openFile,
    exportDocument,
    clearNotice,
  }
}
