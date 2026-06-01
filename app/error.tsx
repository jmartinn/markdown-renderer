"use client"

import { useEffect } from "react"

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--md-bg)] px-6 text-[var(--md-body)]">
      <section className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--md-heading)]">
          The editor could not render
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--md-muted)]">
          Your browser session is still local. Try rendering the page again, or reload before opening another file.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-6 inline-flex cursor-pointer items-center rounded-[var(--md-radius-sm)] bg-[var(--md-btn-bg)] px-4 py-2 text-sm font-medium text-[var(--md-btn-text)] transition-colors hover:bg-[var(--md-btn-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-link)]"
        >
          Try again
        </button>
      </section>
    </main>
  )
}
