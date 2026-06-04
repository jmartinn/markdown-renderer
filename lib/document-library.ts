import { parseStoredDraft } from "@/lib/draft-storage"
import {
  DRAFT_STORAGE_KEY,
  DEFAULT_FILE_NAME,
  createSampleDocument,
  type DocumentSource,
  type MarkdownDocument,
} from "@/lib/markdown-document"
export const LIBRARY_STORAGE_KEY = "markdown-renderer:library:v1"
export const LIBRARY_STORAGE_VERSION = 1
export const MAX_LIBRARY_DOCUMENTS = 50
export const MAX_LIBRARY_BYTES = 5 * 1024 * 1024

export interface LibraryDocument {
  id: string
  title: string
  content: string
  fileName: string
  dirty: boolean
  lastLoadedAt: number
  source: DocumentSource
  updatedAt: number
}

export interface DocumentLibrary {
  version: typeof LIBRARY_STORAGE_VERSION
  activeId: string
  documents: LibraryDocument[]
}

export function createDocumentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function deriveDocumentTitle(content: string, fileName: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim()
  if (heading) return heading.slice(0, 80)

  const base = fileName.replace(/\.(md|markdown|txt)$/i, "").trim()
  if (base && base.toLowerCase() !== "document") return base.slice(0, 80)

  return "Untitled"
}

export function libraryDocumentFromMarkdown(
  document: MarkdownDocument,
  id = createDocumentId(),
  updatedAt = Date.now()
): LibraryDocument {
  return {
    id,
    title: deriveDocumentTitle(document.content, document.fileName),
    content: document.content,
    fileName: document.fileName,
    dirty: document.dirty,
    lastLoadedAt: document.lastLoadedAt,
    source: document.source,
    updatedAt,
  }
}

export function toMarkdownDocument(entry: LibraryDocument): MarkdownDocument {
  return {
    content: entry.content,
    fileName: entry.fileName,
    dirty: entry.dirty,
    lastLoadedAt: entry.lastLoadedAt,
    source: entry.source,
  }
}

export function createEmptyLibraryDocument(now = Date.now()): LibraryDocument {
  const document = createSampleDocument(now)
  return libraryDocumentFromMarkdown(document, createDocumentId(), now)
}

export function createBlankLibraryDocument(now = Date.now()): LibraryDocument {
  return libraryDocumentFromMarkdown(
    {
      content: "# Untitled\n\n",
      fileName: DEFAULT_FILE_NAME,
      dirty: false,
      lastLoadedAt: now,
      source: "typed",
    },
    createDocumentId(),
    now
  )
}

export function createInitialLibrary(now = Date.now()): DocumentLibrary {
  const document = libraryDocumentFromMarkdown(createSampleDocument(now), createDocumentId(), now)

  return {
    version: LIBRARY_STORAGE_VERSION,
    activeId: document.id,
    documents: [document],
  }
}

export function parseLibrary(rawValue: string | null): DocumentLibrary | null {
  if (!rawValue) return null

  try {
    const parsed = JSON.parse(rawValue) as Partial<DocumentLibrary>
    if (parsed.version !== LIBRARY_STORAGE_VERSION || !Array.isArray(parsed.documents)) return null
    if (typeof parsed.activeId !== "string") return null

    const documents = parsed.documents.filter(isValidLibraryDocument)
    if (documents.length === 0) return null

    const activeId = documents.some((doc) => doc.id === parsed.activeId)
      ? parsed.activeId!
      : documents[0].id

    return {
      version: LIBRARY_STORAGE_VERSION,
      activeId,
      documents,
    }
  } catch {
    return null
  }
}

function isValidLibraryDocument(value: unknown): value is LibraryDocument {
  if (!value || typeof value !== "object") return false
  const doc = value as Partial<LibraryDocument>

  return (
    typeof doc.id === "string" &&
    typeof doc.title === "string" &&
    typeof doc.content === "string" &&
    typeof doc.fileName === "string" &&
    typeof doc.dirty === "boolean" &&
    typeof doc.lastLoadedAt === "number" &&
    typeof doc.source === "string" &&
    typeof doc.updatedAt === "number"
  )
}

export function serializeLibrary(library: DocumentLibrary): string {
  return JSON.stringify(library)
}

export function getActiveDocument(library: DocumentLibrary): LibraryDocument {
  return library.documents.find((doc) => doc.id === library.activeId) ?? library.documents[0]
}

export function updateActiveDocument(
  library: DocumentLibrary,
  patch: Partial<MarkdownDocument>
): DocumentLibrary {
  const now = Date.now()

  const documents = library.documents.map((doc) => {
    if (doc.id !== library.activeId) return doc

    const next: LibraryDocument = {
      ...doc,
      ...patch,
      updatedAt: now,
    }

    if (patch.content !== undefined || patch.fileName !== undefined) {
      next.title = deriveDocumentTitle(next.content, next.fileName)
    }

    return next
  })

  return { ...library, documents }
}

export function selectDocument(library: DocumentLibrary, id: string): DocumentLibrary | null {
  if (!library.documents.some((doc) => doc.id === id)) return null

  return { ...library, activeId: id }
}

export function addDocument(library: DocumentLibrary, document: LibraryDocument): DocumentLibrary | "limit" {
  if (library.documents.length >= MAX_LIBRARY_DOCUMENTS) return "limit"

  return {
    version: library.version,
    activeId: document.id,
    documents: [...library.documents, document],
  }
}

export function removeDocument(library: DocumentLibrary, id: string): DocumentLibrary | null {
  if (library.documents.length <= 1) return null
  if (!library.documents.some((doc) => doc.id === id)) return null

  const documents = library.documents.filter((doc) => doc.id !== id)
  const activeId =
    library.activeId === id ? documents[documents.length - 1].id : library.activeId

  return { ...library, activeId, documents }
}

export function libraryPayloadSize(library: DocumentLibrary): number {
  return serializeLibrary(library).length
}

export function loadLibraryFromStorage(
  getItem: (key: string) => string | null,
  removeItem: (key: string) => void
): DocumentLibrary {
  const stored = parseLibrary(getItem(LIBRARY_STORAGE_KEY))
  if (stored) return stored

  const legacyDraft = parseStoredDraft(getItem(DRAFT_STORAGE_KEY))
  if (legacyDraft) {
    removeItem(DRAFT_STORAGE_KEY)
    const document = libraryDocumentFromMarkdown(legacyDraft)
    return {
      version: LIBRARY_STORAGE_VERSION,
      activeId: document.id,
      documents: [document],
    }
  }

  return createInitialLibrary()
}

export function importUploadedDocument(
  library: DocumentLibrary,
  document: MarkdownDocument
): DocumentLibrary {
  return updateActiveDocument(library, document)
}
