import { DRAFT_STORAGE_VERSION, type MarkdownDocument } from "@/lib/markdown-document"

export type StorageFailureReason = "quota" | "unknown"

const QUOTA_ERROR_NAMES = ["QuotaExceededError", "NS_ERROR_DOM_QUOTA_REACHED"]

/** Identify a localStorage write that failed because the store is full. */
export function classifyStorageError(error: unknown): StorageFailureReason {
  if (error instanceof DOMException) {
    if (QUOTA_ERROR_NAMES.includes(error.name) || error.code === 22 || error.code === 1014) {
      return "quota"
    }
  }
  return "unknown"
}

/** Human-readable copy for a save failure. */
export function describeSaveError(reason: StorageFailureReason): string {
  if (reason === "quota") return "Your draft is too large to save in this browser."
  return "Draft changes could not be saved in this browser."
}

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
