import { SAMPLE_MARKDOWN_CONTENT } from "@/lib/sample-content"

export const ACCEPTED_MARKDOWN_EXTENSIONS = [".md", ".markdown", ".txt"] as const
export const MAX_MARKDOWN_FILE_BYTES = 5 * 1024 * 1024
export const DRAFT_STORAGE_KEY = "markdown-renderer:draft:v1"
export const DRAFT_STORAGE_VERSION = 1
export const DEFAULT_FILE_NAME = "document.md"

export type DocumentSource = "sample" | "typed" | "uploaded" | "restored"

export interface MarkdownDocument {
  content: string
  fileName: string
  dirty: boolean
  lastLoadedAt: number
  source: DocumentSource
}

export interface DocumentCounts {
  words: number
  characters: number
}

export function createSampleDocument(now = Date.now()): MarkdownDocument {
  return {
    content: SAMPLE_MARKDOWN_CONTENT,
    fileName: DEFAULT_FILE_NAME,
    dirty: false,
    lastLoadedAt: now,
    source: "sample",
  }
}

export function isAcceptedMarkdownFileName(fileName: string): boolean {
  const normalized = fileName.toLowerCase()
  return ACCEPTED_MARKDOWN_EXTENSIONS.some((extension) => normalized.endsWith(extension))
}

export function describeAcceptedMarkdownExtensions(): string {
  return ACCEPTED_MARKDOWN_EXTENSIONS.join(", ")
}

export function getDocumentCounts(content: string): DocumentCounts {
  const trimmed = content.trim()

  return {
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    characters: content.length,
  }
}

export function getExportFileName(document: Pick<MarkdownDocument, "fileName">): string {
  const baseName = document.fileName.trim().split(/[\\/]/).pop() || DEFAULT_FILE_NAME
  const markdownName = baseName.replace(/\.(md|markdown|txt)$/i, "")
  const safeName = markdownName.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "")

  return `${safeName || "document"}.md`
}
