import type { Element, Root, Text } from "hast"
import { toText } from "hast-util-to-text"
import { describe, expect, it } from "vitest"

import { HIGHLIGHT_LANGUAGES, rehypeCuratedHighlight } from "@/lib/markdown-highlight"

/** Build a `<pre><code class="...">text</code></pre>` hast tree. */
function codeBlockTree(className: string[] | undefined, text: string): Root {
  return {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "code",
            properties: className ? { className } : {},
            children: [{ type: "text", value: text }],
          },
        ],
      },
    ],
  }
}

function getCode(tree: Root): Element {
  return (tree.children[0] as Element).children[0] as Element
}

function runHighlight(tree: Root): Root {
  rehypeCuratedHighlight()(tree)
  return tree
}

describe("rehypeCuratedHighlight", () => {
  it("highlights a bundled language and preserves the raw text", () => {
    const tree = runHighlight(codeBlockTree(["language-ts"], "const x = 1"))
    const code = getCode(tree)

    expect(code.properties.className).toContain("hljs")
    expect(code.properties.className).toContain("language-ts")
    // Highlighting replaces the single text node with nested <span> elements.
    expect(code.children.some((child) => child.type === "element")).toBe(true)
    // ...but the visible text is unchanged.
    expect(toText(code, { whitespace: "pre" })).toBe("const x = 1")
  })

  it("resolves aliases to their canonical grammar", () => {
    const tree = runHighlight(codeBlockTree(["language-js"], "const y = 2"))
    const code = getCode(tree)

    expect(code.properties.className).toContain("hljs")
    expect(code.children.some((child) => child.type === "element")).toBe(true)
  })

  it("leaves languages we don't bundle as plain text", () => {
    const tree = runHighlight(codeBlockTree(["language-cobol"], "DISPLAY 'hi'."))
    const code = getCode(tree)

    expect(code.properties.className).not.toContain("hljs")
    expect(code.children).toHaveLength(1)
    expect((code.children[0] as Text).value).toBe("DISPLAY 'hi'.")
  })

  it("leaves fenced blocks without a language untouched", () => {
    const tree = runHighlight(codeBlockTree(undefined, "plain text"))
    const code = getCode(tree)

    expect(code.properties.className).toBeUndefined()
    expect((code.children[0] as Text).value).toBe("plain text")
  })

  it("respects an explicit no-highlight opt-out", () => {
    const tree = runHighlight(codeBlockTree(["language-ts", "no-highlight"], "const z = 3"))
    const code = getCode(tree)

    expect(code.properties.className).not.toContain("hljs")
    expect((code.children[0] as Text).value).toBe("const z = 3")
  })

  it("ignores inline code that is not inside a <pre>", () => {
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [
            {
              type: "element",
              tagName: "code",
              properties: { className: ["language-ts"] },
              children: [{ type: "text", value: "inline" }],
            },
          ],
        },
      ],
    }

    runHighlight(tree)
    const code = (tree.children[0] as Element).children[0] as Element

    expect(code.properties.className).not.toContain("hljs")
    expect((code.children[0] as Text).value).toBe("inline")
  })

  it("bundles the curated web/dev grammar set", () => {
    expect(HIGHLIGHT_LANGUAGES.sort()).toEqual(
      [
        "bash",
        "css",
        "javascript",
        "json",
        "markdown",
        "python",
        "sql",
        "typescript",
        "xml",
        "yaml",
      ].sort()
    )
  })
})
