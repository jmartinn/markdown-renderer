"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { downloadMarkdownDocument, MarkdownFileError, readMarkdownFile } from "@/lib/file-transfer"
import {
  LIBRARY_STORAGE_KEY,
  addDocument,
  createBlankLibraryDocument,
  getActiveDocument,
  importUploadedDocument,
  libraryPayloadSize,
  loadLibraryFromStorage,
  removeDocument,
  selectDocument,
  serializeLibrary,
  toMarkdownDocument,
  updateActiveDocument,
  MAX_LIBRARY_BYTES,
  MAX_LIBRARY_DOCUMENTS,
  type DocumentLibrary,
} from "@/lib/document-library"
import { getDocumentCounts, getExportFileName } from "@/lib/markdown-document"

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

function readLibrary(storage: Storage | null): DocumentLibrary {
  if (!storage) {
    return loadLibraryFromStorage(() => null, () => undefined)
  }

  return loadLibraryFromStorage(
    (key) => storage.getItem(key),
    (key) => storage.removeItem(key)
  )
}

function writeLibrary(storage: Storage | null, library: DocumentLibrary): boolean {
  if (!storage) return false

  try {
    const payload = serializeLibrary(library)
    if (libraryPayloadSize(library) > MAX_LIBRARY_BYTES) return false

    storage.setItem(LIBRARY_STORAGE_KEY, payload)
    return true
  } catch {
    return false
  }
}

export function useMarkdownDocument(options: UseMarkdownDocumentOptions = {}) {
  const [library, setLibrary] = useState<DocumentLibrary>(() => readLibrary(null))
  const [notice, setNotice] = useState<DocumentNotice | null>(null)
  const [ready, setReady] = useState(false)
  const storage = resolveStorage(options.storage)

  useEffect(() => {
    const loaded = readLibrary(storage)
    const hadLegacyOnly =
      storage?.getItem(LIBRARY_STORAGE_KEY) == null &&
      storage?.getItem("markdown-renderer:draft:v1") != null

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLibrary(loaded)
    if (hadLegacyOnly) {
      setNotice({ type: "info", message: "Moved your last draft into the document library." })
    }
    setReady(true)
  }, [storage])

  const activeEntry = useMemo(() => getActiveDocument(library), [library])
  const document = useMemo(() => toMarkdownDocument(activeEntry), [activeEntry])

  const documents = useMemo(
    () =>
      [...library.documents].sort(
        (left, right) => right.updatedAt - left.updatedAt
      ),
    [library.documents]
  )

  const latestLibraryRef = useRef(library)
  useEffect(() => {
    latestLibraryRef.current = library
  }, [library])

  useEffect(() => {
    if (!ready) return

    const timer = setTimeout(() => {
      const persisted = writeLibrary(storage, library)
      if (!persisted && storage) {
        setNotice({
          type: "error",
          message: "Documents could not be saved in this browser (storage full or unavailable).",
        })
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [library, ready, storage])

  useEffect(() => {
    if (!ready || !storage) return

    const flush = () => {
      writeLibrary(storage, latestLibraryRef.current)
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
  }, [ready, storage])

  const counts = useMemo(() => getDocumentCounts(document.content), [document.content])
  const exportFileName = useMemo(() => getExportFileName(document), [document])

  const updateContent = useCallback((content: string) => {
    setLibrary((current) =>
      updateActiveDocument(current, {
        content,
        dirty: true,
        source: "typed",
      })
    )
  }, [])

  const openFile = useCallback(async (file: File | undefined): Promise<boolean> => {
    if (!file) return false

    try {
      const content = await readMarkdownFile(file)
      const uploaded = {
        content,
        fileName: file.name,
        dirty: false,
        lastLoadedAt: Date.now(),
        source: "uploaded" as const,
      }

      setLibrary((current) => importUploadedDocument(current, uploaded))
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

  const selectDocumentById = useCallback((id: string) => {
    setLibrary((current) => selectDocument(current, id) ?? current)
    setNotice(null)
  }, [])

  const createDocument = useCallback(() => {
    setLibrary((current) => {
      const next = addDocument(current, createBlankLibraryDocument())
      if (next === "limit") {
        setNotice({
          type: "error",
          message: `You can save up to ${MAX_LIBRARY_DOCUMENTS} documents in this browser.`,
        })
        return current
      }

      setNotice({ type: "info", message: "Created a new document." })
      return next
    })
  }, [])

  const deleteDocument = useCallback((id: string) => {
    setLibrary((current) => {
      const next = removeDocument(current, id)
      if (!next) return current
      return next
    })
    setNotice({ type: "info", message: "Document deleted." })
  }, [])

  const clearNotice = useCallback(() => {
    setNotice(null)
  }, [])

  return {
    document,
    activeDocumentId: library.activeId,
    documents,
    counts,
    notice,
    exportFileName,
    draftReady: ready,
    updateContent,
    openFile,
    exportDocument,
    selectDocument: selectDocumentById,
    createDocument,
    deleteDocument,
    clearNotice,
  }
}
