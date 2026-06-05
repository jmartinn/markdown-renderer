import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PreviewPane } from "@/components/editor/preview-pane"

describe("PreviewPane", () => {
  it("shows the updating indicator without announcing it to screen readers", () => {
    // content="" keeps the heavy MarkdownRenderer unmounted; the indicator lives in
    // the header and only depends on isStale.
    render(<PreviewPane content="" view="preview" isStale={true} />)

    const indicator = screen.getByText("Updating preview…")
    expect(indicator.getAttribute("role")).toBeNull()
    expect(indicator.getAttribute("aria-live")).toBeNull()
  })
})
