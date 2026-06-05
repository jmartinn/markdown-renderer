import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--md-bg)] px-6 text-[var(--md-body)]">
      <section className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--md-heading)]">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--md-muted)]">
          This app has one workspace for editing and previewing Markdown.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded-[var(--md-radius-sm)] bg-[var(--md-btn-bg)] px-4 py-2 text-sm font-medium text-[var(--md-btn-text)] transition-colors hover:bg-[var(--md-btn-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-focus)]"
        >
          Return to editor
        </Link>
      </section>
    </main>
  )
}
