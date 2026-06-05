import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { INFO_NOTICE_DISMISS_MS, useDismissibleNotice } from "@/hooks/use-dismissible-notice"

describe("useDismissibleNotice", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("auto-dismisses info notices after the delay", () => {
    const { result } = renderHook(() => useDismissibleNotice())

    act(() => {
      result.current.showNotice({ type: "info", message: "Opened notes.md." })
    })
    expect(result.current.notice?.message).toBe("Opened notes.md.")

    act(() => {
      vi.advanceTimersByTime(INFO_NOTICE_DISMISS_MS)
    })
    expect(result.current.notice).toBeNull()
  })

  it("keeps error notices until cleared", () => {
    const { result } = renderHook(() => useDismissibleNotice())

    act(() => {
      result.current.showNotice({ type: "error", message: "Save failed" })
    })
    act(() => {
      vi.advanceTimersByTime(INFO_NOTICE_DISMISS_MS * 2)
    })
    expect(result.current.notice?.message).toBe("Save failed")

    act(() => {
      result.current.clearNotice()
    })
    expect(result.current.notice).toBeNull()
  })

  it("replacing a notice cancels the previous auto-dismiss timer", () => {
    const { result } = renderHook(() => useDismissibleNotice())

    act(() => {
      result.current.showNotice({ type: "info", message: "First" })
    })
    act(() => {
      vi.advanceTimersByTime(INFO_NOTICE_DISMISS_MS - 1)
      result.current.showNotice({ type: "error", message: "Second" })
    })
    // The first timer would have fired here; it must not clear the error.
    act(() => {
      vi.advanceTimersByTime(INFO_NOTICE_DISMISS_MS)
    })
    expect(result.current.notice?.message).toBe("Second")
  })
})
