import { DRAFT_STORAGE_VERSION, type MarkdownDocument } from "@/lib/markdown-document"

export interface StoredMarkdownDraft {
  version: typeof DRAFT_STORAGE_VERSION
  savedAt: number
  document: MarkdownDocument
}

export function serializeDraft(document: MarkdownDocument, savedAt = Date.now()): string {
  const draft: StoredMarkdownDraft = {
    version: DRAFT_STORAGE_VERSION,
    savedAt,
    document,
  }

  return JSON.stringify(draft)
}

export function parseStoredDraft(rawValue: string | null): MarkdownDocument | null {
  if (!rawValue) return null

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredMarkdownDraft>
    const document = parsed.document

    if (parsed.version !== DRAFT_STORAGE_VERSION || !document) return null
    if (typeof document.content !== "string" || typeof document.fileName !== "string") return null
    if (typeof document.dirty !== "boolean" || typeof document.lastLoadedAt !== "number") return null

    return {
      content: document.content,
      fileName: document.fileName,
      dirty: document.dirty,
      lastLoadedAt: document.lastLoadedAt,
      source: "restored",
    }
  } catch {
    return null
  }
}
