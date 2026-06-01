import { isValidElement, type ReactNode } from "react"

interface TextElementProps {
  children?: ReactNode
  dangerouslySetInnerHTML?: {
    __html?: string
  }
}

const HTML_TAG_PATTERN = /<[^>]*>/g

export function parseCodeLanguage(className: string | undefined): string | null {
  const language = className?.match(/(?:^|\s)language-([^\s]+)/)?.[1]
  return language ?? null
}

export function extractTextFromReactNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (!node || typeof node === "boolean") return ""
  if (Array.isArray(node)) return node.map(extractTextFromReactNode).join("")

  if (isValidElement<TextElementProps>(node)) {
    const html = node.props.dangerouslySetInnerHTML?.__html
    if (html) return html.replace(HTML_TAG_PATTERN, "")

    return extractTextFromReactNode(node.props.children)
  }

  return ""
}
