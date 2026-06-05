import { createElement } from "react"
import { describe, expect, it } from "vitest"

import {
  extractCodeBlockProps,
  extractTextFromReactNode,
  parseCodeLanguage,
} from "@/lib/markdown-rendering"

describe("parseCodeLanguage", () => {
  it("extracts the language from a language-* class", () => {
    expect(parseCodeLanguage("language-ts")).toBe("ts")
    expect(parseCodeLanguage("hljs language-python")).toBe("python")
  })

  it("returns null when no language class is present", () => {
    expect(parseCodeLanguage("hljs")).toBeNull()
    expect(parseCodeLanguage("")).toBeNull()
    expect(parseCodeLanguage(undefined)).toBeNull()
  })
})

describe("extractTextFromReactNode", () => {
  it("returns strings and numbers directly", () => {
    expect(extractTextFromReactNode("hello")).toBe("hello")
    expect(extractTextFromReactNode(42)).toBe("42")
  })

  it("returns an empty string for nullish and boolean nodes", () => {
    expect(extractTextFromReactNode(null)).toBe("")
    expect(extractTextFromReactNode(undefined)).toBe("")
    expect(extractTextFromReactNode(true)).toBe("")
    expect(extractTextFromReactNode(false)).toBe("")
  })

  it("concatenates arrays of nodes", () => {
    expect(extractTextFromReactNode(["a", "b", 1])).toBe("ab1")
  })

  it("reads text from nested element children", () => {
    const tree = createElement("span", null, "const ", createElement("em", null, "x"))
    expect(extractTextFromReactNode(tree)).toBe("const x")
  })

  it("strips tags from dangerouslySetInnerHTML content", () => {
    const node = createElement("code", {
      dangerouslySetInnerHTML: { __html: '<span class="hljs-keyword">const</span> x' },
    })
    expect(extractTextFromReactNode(node)).toBe("const x")
  })
})

describe("extractCodeBlockProps", () => {
  it("returns the language and raw text of a fenced code element", () => {
    const code = createElement("code", { className: "language-ts" }, "const x = 1")
    expect(extractCodeBlockProps(code)).toEqual({ language: "ts", rawText: "const x = 1" })
  })

  it("returns null language and empty text when children are not a code element", () => {
    expect(extractCodeBlockProps("just text")).toEqual({ language: null, rawText: "" })
  })
})
