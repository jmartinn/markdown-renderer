export const SAMPLE_MARKDOWN_CONTENT = `# Getting Started with Markdown

Welcome to **Markdown Renderer** - a clean, elegant tool for reviewing documents beautifully.

## Features

This renderer supports the full **GitHub Flavored Markdown** spec, including:

- Headings (h1-h6) with crisp typography
- **Bold**, *italic*, and ~~strikethrough~~ text
- Inline \`code\` and fenced code blocks with syntax highlighting
- Tables, blockquotes, and task lists
- Links, images, and horizontal rules

---

## Code Blocks

Here's a TypeScript example with full syntax highlighting:

\`\`\`typescript
import { useState, useCallback } from "react"

interface User {
  id: string
  name: string
  email: string
}

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(\`/api/users/\${id}\`)
  if (!res.ok) throw new Error("User not found")
  return res.json()
}

function UserCard({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null)

  const load = useCallback(async () => {
    const data = await fetchUser(userId)
    setUser(data)
  }, [userId])

  return <button onClick={load}>{user?.name ?? "Load user"}</button>
}
\`\`\`

A shell example:

\`\`\`bash
# Install dependencies and run
pnpm install
pnpm dev
\`\`\`

---

## Tables

| Package         | Version  | License |
|----------------|----------|---------|
| react-markdown | 10.1.0   | MIT     |
| remark-gfm     | 4.0.1    | MIT     |
| rehype-highlight| 7.0.2   | MIT     |
| highlight.js   | 11.11.1  | BSD-3   |

---

## Blockquotes

> "Simplicity is the ultimate sophistication."
> - Leonardo da Vinci

---

## Task Lists

- [x] Light and dark mode
- [x] Syntax highlighted code blocks
- [x] Copy-to-clipboard on code
- [x] GFM tables and task lists
- [ ] Export to PDF

---

## Inline Elements

Use \`inline code\` for short snippets. Visit [CommonMark](https://commonmark.org) for the spec. Images scale responsively within the reader.

That's it - paste your own Markdown in the editor on the left to get started.
`

