import { describe, expect, it } from "vitest"

import {
  ACCEPTED_MARKDOWN_EXTENSIONS,
  DEFAULT_FILE_NAME,
  createSampleDocument,
  describeAcceptedMarkdownExtensions,
  getDocumentCounts,
  getExportFileName,
  isAcceptedMarkdownFileName,
} from "@/lib/markdown-document"
import { SAMPLE_MARKDOWN_CONTENT } from "@/lib/sample-content"

describe("getDocumentCounts", () => {
  it("counts words and characters of ordinary content", () => {
    expect(getDocumentCounts("hello world")).toEqual({ words: 2, characters: 11 })
  })

  it("reports zero words for empty or whitespace-only content", () => {
    expect(getDocumentCounts("")).toEqual({ words: 0, characters: 0 })
    expect(getDocumentCounts("   \n\t  ")).toEqual({ words: 0, characters: 7 })
  })

  it("collapses runs of whitespace when counting words", () => {
    expect(getDocumentCounts("a   b\n\nc").words).toBe(3)
  })

  it("counts characters untrimmed, including surrounding whitespace", () => {
    expect(getDocumentCounts("  hi  ").characters).toBe(6)
  })
})

describe("isAcceptedMarkdownFileName", () => {
  it.each(["notes.md", "NOTES.MD", "readme.markdown", "log.txt", "a.b.md"])(
    "accepts %s",
    (name) => {
      expect(isAcceptedMarkdownFileName(name)).toBe(true)
    }
  )

  it.each(["doc.pdf", "image.png", "noext", "md", "file.mdx"])("rejects %s", (name) => {
    expect(isAcceptedMarkdownFileName(name)).toBe(false)
  })
})

describe("describeAcceptedMarkdownExtensions", () => {
  it("lists the accepted extensions", () => {
    expect(describeAcceptedMarkdownExtensions()).toBe(ACCEPTED_MARKDOWN_EXTENSIONS.join(", "))
  })
})

describe("getExportFileName", () => {
  it("keeps a simple name and normalizes the extension to .md", () => {
    expect(getExportFileName({ fileName: "notes.md" })).toBe("notes.md")
    expect(getExportFileName({ fileName: "notes.markdown" })).toBe("notes.md")
    expect(getExportFileName({ fileName: "notes.txt" })).toBe("notes.md")
  })

  it("strips directory components from posix and windows paths", () => {
    expect(getExportFileName({ fileName: "/Users/me/Documents/notes.md" })).toBe("notes.md")
    expect(getExportFileName({ fileName: "folder\\sub\\notes.md" })).toBe("notes.md")
  })

  it("replaces unsafe characters with hyphens", () => {
    expect(getExportFileName({ fileName: "my notes (final).md" })).toBe("my-notes-final.md")
  })

  it("falls back to document.md for empty or fully-sanitized names", () => {
    expect(getExportFileName({ fileName: "" })).toBe("document.md")
    expect(getExportFileName({ fileName: "   " })).toBe("document.md")
    expect(getExportFileName({ fileName: "***.md" })).toBe("document.md")
  })
})

describe("createSampleDocument", () => {
  it("returns the sample content with a sample source and the given timestamp", () => {
    expect(createSampleDocument(123)).toEqual({
      content: SAMPLE_MARKDOWN_CONTENT,
      fileName: DEFAULT_FILE_NAME,
      dirty: false,
      lastLoadedAt: 123,
      source: "sample",
    })
  })
})
