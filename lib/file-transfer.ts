import {
  DEFAULT_FILE_NAME,
  MAX_MARKDOWN_FILE_BYTES,
  describeAcceptedMarkdownExtensions,
  getExportFileName,
  isAcceptedMarkdownFileName,
  type MarkdownDocument,
} from "@/lib/markdown-document"

/** Base for expected, user-facing import failures whose `message` is safe to surface. */
export class MarkdownFileError extends Error {}

export class UnsupportedMarkdownFileError extends MarkdownFileError {
  constructor(fileName: string) {
    super(`Only ${describeAcceptedMarkdownExtensions()} files are supported. "${fileName}" could not be opened.`)
    this.name = "UnsupportedMarkdownFileError"
  }
}

export class MarkdownFileTooLargeError extends MarkdownFileError {
  constructor(fileName: string) {
    super(`"${fileName}" is larger than 5 MB. Open a smaller Markdown or text file.`)
    this.name = "MarkdownFileTooLargeError"
  }
}

export async function readMarkdownFile(file: File): Promise<string> {
  if (!isAcceptedMarkdownFileName(file.name)) {
    throw new UnsupportedMarkdownFileError(file.name)
  }

  if (file.size > MAX_MARKDOWN_FILE_BYTES) {
    throw new MarkdownFileTooLargeError(file.name)
  }

  if (typeof file.text === "function") {
    return file.text()
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error(`Could not read "${file.name}".`))
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.readAsText(file)
  })
}

export function downloadMarkdownDocument(document: MarkdownDocument): string {
  const fileName = getExportFileName(document)
  const blob = new Blob([document.content], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement("a")

  anchor.href = url
  anchor.download = fileName || DEFAULT_FILE_NAME
  anchor.rel = "noopener"
  anchor.click()
  URL.revokeObjectURL(url)

  return fileName
}
