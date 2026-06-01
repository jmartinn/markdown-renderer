export const DEFAULT_MARKDOWN_CONTENT = `# Getting Started with Markdown

Welcome to **Markdown Renderer** - a clean, elegant tool for reviewing documents beautifully.

## Features

This renderer supports the full **GitHub Flavored Markdown** spec, including:

- Headings (h1-h6) with crisp typography
- **Bold**, *italic*, and ~~strikethrough~~ text
- Inline \`code\` and fenced code blocks with syntax highlighting
- Tables, blockquotes, and task lists
- Links, images, and horizontal rules

---

## Code Blocks

Here's a TypeScript example with full syntax highlighting:

\`\`\`typescript
import { useState, useCallback } from "react"

interface User {
  id: string
  name: string
  email: string
}

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(\`/api/users/\${id}\`)
  if (!res.ok) throw new Error("User not found")
  return res.json()
}

function UserCard({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null)

  const load = useCallback(async () => {
    const data = await fetchUser(userId)
    setUser(data)
  }, [userId])

  return <button onClick={load}>{user?.name ?? "Load user"}</button>
}
\`\`\`

A shell example:

\`\`\`bash
# Install dependencies and run
pnpm install
pnpm dev
\`\`\`

---

## Tables

| Package         | Version  | License |
|----------------|----------|---------|
| react-markdown | 10.1.0   | MIT     |
| remark-gfm     | 4.0.1    | MIT     |
| rehype-highlight| 7.0.2   | MIT     |
| highlight.js   | 11.11.1  | BSD-3   |

---

## Blockquotes

> "Simplicity is the ultimate sophistication."
> - Leonardo da Vinci

---

## Task Lists

- [x] Light and dark mode
- [x] Syntax highlighted code blocks
- [x] Copy-to-clipboard on code
- [x] GFM tables and task lists
- [ ] Export to PDF

---

## Inline Elements

Use \`inline code\` for short snippets. Visit [CommonMark](https://commonmark.org) for the spec. Images scale responsively within the reader.

That's it - paste your own Markdown in the editor on the left to get started.
`

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

export interface StoredMarkdownDraft {
  version: typeof DRAFT_STORAGE_VERSION
  savedAt: number
  document: MarkdownDocument
}

export interface DocumentCounts {
  words: number
  characters: number
}

export function createSampleDocument(now = Date.now()): MarkdownDocument {
  return {
    content: DEFAULT_MARKDOWN_CONTENT,
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
