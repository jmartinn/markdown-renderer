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
        saveStatus="saved"
        exportFileName="document.md"
        onViewChange={noop}
        onOpenFile={noop}
        onExport={noop}
      />
    )

    const heading = screen.getByRole("heading", { level: 1, name: "Markdown Renderer" })
    expect(heading.tagName).toBe("H1")
  })

  it("shows the saving label in the subtitle", () => {
    const noop = () => {}
    render(
      <MarkdownToolbar
        view="split"
        document={createSampleDocument(0)}
        wordCount={3}
        characterCount={13}
        notice={null}
        saveStatus="saving"
        exportFileName="document.md"
        onViewChange={noop}
        onOpenFile={noop}
        onExport={noop}
      />
    )

    expect(screen.getByText("Saving… · document.md")).toBeTruthy()
  })

  it("shows the save-failed label in the subtitle", () => {
    const noop = () => {}
    render(
      <MarkdownToolbar
        view="split"
        document={createSampleDocument(0)}
        wordCount={3}
        characterCount={13}
        notice={null}
        saveStatus="error"
        exportFileName="document.md"
        onViewChange={noop}
        onOpenFile={noop}
        onExport={noop}
      />
    )

    expect(screen.getByText("Save failed · document.md")).toBeTruthy()
  })
})
