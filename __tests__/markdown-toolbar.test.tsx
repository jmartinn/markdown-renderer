import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { MarkdownToolbar } from "@/components/editor/markdown-toolbar"
import { createSampleDocument } from "@/lib/markdown-document"

describe("MarkdownToolbar", () => {
  it("exposes the brand as the page h1 landmark", () => {
    const noop = () => {}
    render(
      <MarkdownToolbar
        view="split"
        document={createSampleDocument(0)}
        wordCount={3}
        characterCount={13}
        notice={null}
        exportFileName="document.md"
        onViewChange={noop}
        onOpenFile={noop}
        onExport={noop}
      />
    )

    const heading = screen.getByRole("heading", { level: 1, name: "Markdown Renderer" })
    expect(heading.tagName).toBe("H1")
  })
})
