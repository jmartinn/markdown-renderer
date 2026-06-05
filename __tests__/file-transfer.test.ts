import { afterEach, describe, expect, it, vi } from "vitest"

import {
  MarkdownFileTooLargeError,
  UnsupportedMarkdownFileError,
  downloadMarkdownDocument,
  readMarkdownFile,
} from "@/lib/file-transfer"
import { MAX_MARKDOWN_FILE_BYTES, type MarkdownDocument } from "@/lib/markdown-document"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function makeFile(content: string, name: string): File {
  return new File([content], name, { type: "text/markdown" })
}

describe("readMarkdownFile", () => {
  it("reads accepted markdown and text files via File.text()", async () => {
    await expect(readMarkdownFile(makeFile("# Hi", "notes.md"))).resolves.toBe("# Hi")
    await expect(readMarkdownFile(makeFile("plain", "log.txt"))).resolves.toBe("plain")
    await expect(readMarkdownFile(makeFile("md", "x.markdown"))).resolves.toBe("md")
  })

  it("rejects unsupported file types before reading", async () => {
    await expect(readMarkdownFile(makeFile("x", "report.pdf"))).rejects.toBeInstanceOf(
      UnsupportedMarkdownFileError
    )
  })

  it("rejects files over the size limit", async () => {
    const file = makeFile("x", "huge.md")
    Object.defineProperty(file, "size", { value: MAX_MARKDOWN_FILE_BYTES + 1 })
    await expect(readMarkdownFile(file)).rejects.toBeInstanceOf(MarkdownFileTooLargeError)
  })

  it("falls back to FileReader when File.text is unavailable", async () => {
    const file = makeFile("# Fallback", "notes.md")
    Object.defineProperty(file, "text", { value: undefined })
    await expect(readMarkdownFile(file)).resolves.toBe("# Fallback")
  })

  it("rejects with a safe message when FileReader errors", async () => {
    const file = makeFile("boom", "notes.md")
    Object.defineProperty(file, "text", { value: undefined })

    class FailingFileReader {
      onerror: (() => void) | null = null
      onload: (() => void) | null = null
      result: string | null = null
      readAsText() {
        this.onerror?.()
      }
    }
    vi.stubGlobal("FileReader", FailingFileReader)

    await expect(readMarkdownFile(file)).rejects.toThrow(/Could not read/)
  })
})

describe("downloadMarkdownDocument", () => {
  it("creates and revokes a blob URL, clicks the anchor, and returns the export name", () => {
    const createObjectURL = vi.fn(() => "blob:mock")
    const revokeObjectURL = vi.fn()
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

    const document: MarkdownDocument = {
      content: "# Hi",
      fileName: "my notes.txt",
      dirty: false,
      lastLoadedAt: 0,
      source: "typed",
    }

    expect(downloadMarkdownDocument(document)).toBe("my-notes.md")
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock")
  })
})
