"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import rehypeHighlight from "rehype-highlight"
import { memo, useState, useCallback, useEffect, useRef } from "react"
import type { Components } from "react-markdown"

import { extractTextFromReactNode, parseCodeLanguage } from "@/lib/markdown-rendering"

interface MarkdownRendererProps {
  content: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      // Try modern Clipboard API first
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for sandboxed environments where Clipboard API is blocked
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "absolute"
      textarea.style.left = "-9999px"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setCopied(true)
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy code"}
      className="flex items-center gap-1.5 text-[11px] font-mono font-medium transition-[color,transform] duration-150 active:scale-95
        text-[var(--md-code-copy)] hover:text-[var(--md-code-copy-hover)]"
    >
      {/* Keyed so the swapped icon pops in (enter → ease-out) on copy. */}
      <span
        key={copied ? "check" : "copy"}
        className="flex animate-in fade-in zoom-in-75 duration-150 ease-[var(--ease-out-cubic)]"
      >
        {copied ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 4V2.5A.5.5 0 0 0 7.5 2h-5A.5.5 0 0 0 2 2.5v5A.5.5 0 0 0 2.5 8H4" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        )}
      </span>
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

// Hoisted to module scope so react-markdown receives stable component types.
// Defining this map inside MarkdownRenderer would create new component types on
// every render, forcing react-markdown to remount the whole preview subtree.
const components: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="mt-10 mb-4 first:mt-0 text-[1.75rem] font-semibold leading-tight tracking-tight text-[var(--md-heading)] text-balance border-b border-[var(--md-border)] pb-3">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 mb-3 text-[1.375rem] font-semibold leading-snug tracking-tight text-[var(--md-heading)] text-balance">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-2.5 text-[1.125rem] font-semibold leading-snug text-[var(--md-heading)] text-balance">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-5 mb-2 text-base font-semibold text-[var(--md-heading)]">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="mt-4 mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--md-muted)]">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="mt-4 mb-2 text-sm font-semibold text-[var(--md-muted)]">{children}</h6>
  ),

  // Paragraph
  p: ({ children }) => (
    <p className="my-4 leading-relaxed text-[var(--md-body)] text-[0.9375rem]">{children}</p>
  ),

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      className="text-[var(--md-link)] underline underline-offset-3 decoration-[var(--md-link-decoration)] hover:decoration-[var(--md-link)] transition-colors duration-150"
    >
      {children}
    </a>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="my-4 ml-6 space-y-1.5 list-disc marker:text-[var(--md-muted)]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 ml-6 space-y-1.5 list-decimal marker:text-[var(--md-muted)]">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-[0.9375rem] leading-relaxed text-[var(--md-body)] pl-1">{children}</li>
  ),

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="my-5 pl-4 border-l-[3px] border-[var(--md-border-strong)] text-[var(--md-muted)] italic [&>p]:my-1">
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: () => <hr className="my-8 border-none border-t border-[var(--md-border)]" />,

  // Bold / Italic / Strikethrough
  strong: ({ children }) => (
    <strong className="font-semibold text-[var(--md-heading)]">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-[var(--md-body)]">{children}</em>,
  del: ({ children }) => <del className="line-through text-[var(--md-muted)]">{children}</del>,

  // Inline code
  code: ({ children, className, node }) => {
    // Block code carries a `language-*` class from rehype-highlight. But fenced
    // blocks with no language (``` with nothing after it) are left unhighlighted
    // and class-less — detect those via the hast node spanning multiple source
    // lines so they don't fall through to inline styling inside the `pre` chrome.
    const spansMultipleLines =
      node?.position != null && node.position.start.line !== node.position.end.line
    const isInline = !className && !spansMultipleLines
    if (isInline) {
      return (
        <code className="inline-block px-1.5 py-0.5 rounded-[4px] text-[0.8125rem] font-mono bg-[var(--md-code-inline-bg)] text-[var(--md-code-inline-text)] border border-[var(--md-code-border)]">
          {children}
        </code>
      )
    }
    // Block code — content is already highlighted by rehype-highlight
    return <code className={className}>{children}</code>
  },

  // Pre / code blocks
  pre: ({ children, ...props }) => {
    // Extract language and raw highlighted HTML from the rehype pipeline
    const codeEl = (children as React.ReactElement<{ className?: string; children?: React.ReactNode }>)
    const className = codeEl?.props?.className ?? ""
    const language = parseCodeLanguage(className)

    // rehype-highlight produces a <code> with child spans — we need the raw text for copy
    const rawText = extractTextFromReactNode(codeEl?.props?.children)

    // For the highlighted code, we render the children directly
    return (
      <div className="group relative my-5 rounded-[var(--md-radius)] border border-[var(--md-code-border)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--md-code-border)] bg-[var(--md-code-header)]">
          <span className="text-[11px] font-mono font-medium text-[var(--md-code-lang)] uppercase tracking-wider select-none">
            {language ?? "plain"}
          </span>
          <CopyButton text={rawText} />
        </div>
        <div className="overflow-x-auto bg-[var(--md-code-bg)]">
          <pre className="p-4 text-sm leading-relaxed font-mono m-0 [&_code]:!bg-transparent [&_code]:!p-0 [&_code]:!border-none [&_code]:!rounded-none" {...props}>
            {children}
          </pre>
        </div>
      </div>
    )
  },

  // Tables (GFM)
  table: ({ children }) => (
    <div className="my-5 overflow-x-auto rounded-[var(--md-radius)] border border-[var(--md-border)]">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[var(--md-table-head)]">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-[var(--md-border)] last:border-0 hover:bg-[var(--md-table-row-hover)] transition-colors duration-100">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-left font-semibold text-[0.8125rem] text-[var(--md-heading)] uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-[0.9rem] text-[var(--md-body)] leading-relaxed">{children}</td>
  ),

  // Images
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? ""}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className="my-5 max-w-full rounded-[var(--md-radius)] border border-[var(--md-border)]"
    />
  ),
}

// Memoized so deferring `content` (see MarkdownEditor) actually skips the
// expensive parse + syntax highlight when the deferred value hasn't changed.
export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeHighlight]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  )
})
