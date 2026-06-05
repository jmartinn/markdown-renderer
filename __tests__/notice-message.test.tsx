import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { NoticeMessage } from "@/components/editor/notice-message"

describe("NoticeMessage", () => {
  it("keeps a live region in the DOM even with no notice", () => {
    render(<NoticeMessage notice={null} onDismiss={() => {}} />)
    expect(screen.getByRole("status")).toBeTruthy()
  })

  it("renders an error notice with a dismiss button that calls onDismiss", () => {
    const onDismiss = vi.fn()
    render(
      <NoticeMessage notice={{ type: "error", message: "Save failed" }} onDismiss={onDismiss} />
    )

    expect(screen.getByText("Save failed")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notice" }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it("does not render a dismiss button for info notices", () => {
    render(<NoticeMessage notice={{ type: "info", message: "Opened notes.md." }} onDismiss={() => {}} />)
    expect(screen.queryByRole("button", { name: "Dismiss notice" })).toBeNull()
  })
})
