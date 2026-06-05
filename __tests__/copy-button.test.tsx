import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CopyButton } from "@/components/editor/copy-button"

describe("CopyButton", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it("announces copy success through a polite live region", async () => {
    render(<CopyButton text="const x = 1" />)

    const status = screen.getByRole("status")
    expect(status.textContent).toBe("")

    fireEvent.click(screen.getByRole("button", { name: "Copy code" }))

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("Copied")
    })
  })
})
