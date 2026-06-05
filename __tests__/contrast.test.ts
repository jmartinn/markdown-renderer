import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { parse, wcagContrast } from "culori"
import { describe, expect, it } from "vitest"

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8")

/** Pull `--name: value;` custom-property declarations out of a CSS string. */
function parseVars(source: string): Record<string, string> {
  const vars: Record<string, string> = {}
  const re = /(--[\w-]+):\s*([^;]+);/g
  let match: RegExpExecArray | null
  while ((match = re.exec(source)) !== null) {
    vars[match[1]] = match[2].trim()
  }
  return vars
}

// Target the `.dark { ... }` block that actually declares `--md-*` tokens (not the
// `@layer base` `.dark { color-scheme }` block), so reordering the file can't make
// us silently capture the wrong block. Custom-property blocks contain no nested
// braces, so `[^}]*` captures one whole block.
const darkMatch = css.match(/\.dark\s*\{([^}]*--md-[^}]*)\}/)
if (!darkMatch) throw new Error("Could not find a .dark token block in globals.css")

const darkVars = parseVars(darkMatch[1])
const lightVars = parseVars(css.replace(darkMatch[0], ""))

/** Resolve `var(--x)` indirection within a single theme map. */
function resolveToken(name: string, vars: Record<string, string>): string {
  let value: string | undefined = vars[name]
  let guard = 0
  while (value && value.startsWith("var(") && guard++ < 10) {
    const inner = value.slice(value.indexOf("(") + 1, value.lastIndexOf(")"))
    const ref = inner.split(",")[0].trim()
    value = vars[ref]
  }
  if (!value) throw new Error(`Token ${name} is undefined or resolves to nothing`)
  return value
}

const THEMES = [
  { name: "light", vars: lightVars },
  { name: "dark", vars: darkVars },
]

// [foreground, background, minimum ratio] — normal-size text needs >= 4.5:1.
const TEXT_PAIRS: [string, string, number][] = [
  ["--md-body", "--md-bg", 4.5],
  ["--md-muted", "--md-bg", 4.5],
  ["--md-heading", "--md-bg", 4.5],
  ["--md-link", "--md-bg", 4.5],
  ["--md-body", "--md-surface", 4.5],
  ["--md-muted", "--md-surface", 4.5],
  ["--md-editor-text", "--md-editor-bg", 4.5],
  ["--md-code-inline-text", "--md-code-inline-bg", 4.5],
  ["--md-code-lang", "--md-code-header", 4.5],
  ["--md-code-copy", "--md-code-header", 4.5],
]

// Non-text contrast (WCAG 1.4.11) for the focus indicator — needs >= 3:1.
const NON_TEXT_PAIRS: [string, string, number][] = [
  ["--md-focus", "--md-bg", 3],
  ["--md-focus", "--md-editor-bg", 3],
]

describe("globals.css contrast budget", () => {
  for (const theme of THEMES) {
    for (const [fg, bg, min] of [...TEXT_PAIRS, ...NON_TEXT_PAIRS]) {
      it(`${theme.name}: ${fg} on ${bg} >= ${min}:1`, () => {
        const ratio = wcagContrast(
          resolveToken(fg, theme.vars),
          resolveToken(bg, theme.vars)
        )
        expect(ratio).toBeGreaterThanOrEqual(min)
      })
    }
  }

  for (const theme of THEMES) {
    it(`${theme.name}: links are visually distinct from body text`, () => {
      const link = resolveToken("--md-link", theme.vars)
      const body = resolveToken("--md-body", theme.vars)
      expect(link).not.toBe(body)
      // The accent must carry real chroma so links never read as plain gray text.
      const parsed = parse(link) as { c?: number } | undefined
      expect(parsed?.c ?? 0).toBeGreaterThan(0.02)
    })
  }
})
