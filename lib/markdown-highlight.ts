import type { Element, ElementContent, Root } from "hast"
import { toText } from "hast-util-to-text"
import { createLowlight } from "lowlight"
import { visit } from "unist-util-visit"

import bash from "highlight.js/lib/languages/bash"
import css from "highlight.js/lib/languages/css"
import javascript from "highlight.js/lib/languages/javascript"
import json from "highlight.js/lib/languages/json"
import markdown from "highlight.js/lib/languages/markdown"
import python from "highlight.js/lib/languages/python"
import sql from "highlight.js/lib/languages/sql"
import typescript from "highlight.js/lib/languages/typescript"
import xml from "highlight.js/lib/languages/xml"
import yaml from "highlight.js/lib/languages/yaml"

// `rehype-highlight` statically imports lowlight's `common` grammar set (~37
// languages, hundreds of KB) and bundles all of it regardless of which
// `languages` option you pass — `settings.languages || common` keeps `common`
// reachable, so it can never be tree-shaken out of the preview chunk. We build
// our own lowlight instance from a curated grammar set instead, so only these
// languages ship. Add a grammar import above and an entry here to support a new
// fenced-code language.
const lowlight = createLowlight({
  bash,
  css,
  javascript,
  json,
  markdown,
  python,
  sql,
  typescript,
  xml,
  yaml,
})

// Map the language tokens people actually write in code fences onto the
// canonical grammar names registered above (e.g. ```ts``` and ```jsx```).
lowlight.registerAlias({
  bash: ["sh", "shell", "zsh"],
  javascript: ["js", "jsx"],
  markdown: ["md"],
  python: ["py"],
  typescript: ["ts", "tsx"],
  xml: ["html", "svg"],
  yaml: ["yml"],
})

/** Canonical names of the grammars bundled into the preview. */
export const HIGHLIGHT_LANGUAGES = lowlight.listLanguages()

/**
 * Read the fenced language from a `<code>` element's class list, mirroring
 * highlight.js conventions: `language-*` / `lang-*` carry the name, and an
 * explicit `no-highlight` / `nohighlight` opts out (returns `false`).
 */
function readLanguage(node: Element): string | false | undefined {
  const classes = node.properties?.className

  if (!Array.isArray(classes)) return undefined

  let name: string | undefined

  for (const item of classes) {
    const value = String(item)

    if (value === "no-highlight" || value === "nohighlight") return false
    if (!name && value.startsWith("lang-")) name = value.slice(5)
    if (!name && value.startsWith("language-")) name = value.slice(9)
  }

  return name
}

/**
 * A rehype plugin that highlights fenced code blocks with our curated lowlight
 * instance. Behaves like `rehype-highlight` with `detect: false`: code blocks
 * with no language, an opt-out class, or a language we don't bundle are left
 * untouched (rendered as plain text), and only `<code>` directly inside `<pre>`
 * is highlighted — inline code is ignored.
 */
export function rehypeCuratedHighlight() {
  return function transform(tree: Root): undefined {
    visit(tree, "element", function (node, _index, parent) {
      if (
        node.tagName !== "code" ||
        !parent ||
        parent.type !== "element" ||
        parent.tagName !== "pre"
      ) {
        return
      }

      const lang = readLanguage(node)
      if (!lang || !lowlight.registered(lang)) return

      if (!Array.isArray(node.properties.className)) {
        node.properties.className = []
      }
      if (!node.properties.className.includes("hljs")) {
        node.properties.className.unshift("hljs")
      }

      const text = toText(node, { whitespace: "pre" })
      const result = lowlight.highlight(lang, text)

      if (result.children.length > 0) {
        node.children = result.children as ElementContent[]
      }
    })
  }
}
