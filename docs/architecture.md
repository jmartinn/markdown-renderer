# Architecture

## Client-only design

Markdown Renderer has one route, `app/page.tsx`, and no API routes, server actions, accounts, or backend storage. The root layout provides metadata, fonts, analytics in production, and theme context. The editor itself is a Client Component because it depends on browser APIs such as `File`, `localStorage`, `Blob`, downloads, drag/drop, and the clipboard.

## State model

The document state is centralized in `hooks/use-markdown-document.ts`:

- `content`: the current Markdown source.
- `fileName`: the source file name or default export name.
- `dirty`: whether the user has typed since the last sample/upload restore point.
- `lastLoadedAt`: timestamp for the sample, restored draft, or uploaded file.
- `source`: one of `sample`, `typed`, `uploaded`, or `restored`.

The hook also exposes word/character counts, notices, the export filename, upload handling, export handling, and draft persistence.

## Persistence

Drafts are serialized under the versioned key `markdown-renderer:draft:v1` via `lib/draft-storage.ts`. The version is part of the payload so future migrations can ignore incompatible drafts safely. Storage reads and writes are wrapped in `try/catch`; if storage is unavailable, the app still works without draft persistence.

## Rendering pipeline

`components/markdown-renderer.tsx` is the Markdown rendering boundary:

1. `react-markdown` parses Markdown.
2. `remark-gfm` enables tables, task lists, and strikethrough.
3. `remark-breaks` preserves line breaks.
4. `rehypeCuratedHighlight` (`lib/markdown-highlight.ts`) applies syntax highlighting with a curated lowlight grammar set.
5. A stable `components` map renders the app's Markdown typography and copyable code block chrome.

The preview receives a deferred content value from `MarkdownEditor`, keeping typing responsive while large Markdown trees are reparsed. When the preview is hidden, the renderer is not mounted, avoiding repeated expensive parsing for editor-only mode.

## Code block copying

Highlighted code blocks contain nested React nodes after `rehypeCuratedHighlight` runs. `lib/markdown-rendering.ts` extracts plain text from those nodes and parses `language-*` class names. Keeping this logic pure makes the copy behavior testable outside the renderer.

`lib/markdown-highlight.ts` deliberately replaces `rehype-highlight`, which statically bundles lowlight's full `common` grammar set (~37 languages) no matter which `languages` option you pass. The curated plugin registers only a small web/dev language set on its own lowlight instance, trimming the dynamically-imported preview chunk.

## Images

Markdown images intentionally render as raw `<img>` tags with lazy loading, async decoding, and `referrerPolicy="no-referrer"`. User Markdown can reference arbitrary remote image URLs, so `next/image` cannot be configured with a safe fixed allowlist without blocking expected Markdown behavior.
