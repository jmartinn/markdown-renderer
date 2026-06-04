import { describe, expect, it } from 'vitest'

import { parseStoredDraft, serializeDraft } from '@/lib/draft-storage'
import { DRAFT_STORAGE_VERSION, type MarkdownDocument } from '@/lib/markdown-document'

const sampleDocument: MarkdownDocument = {
  content: '# Draft',
  fileName: 'draft.md',
  dirty: true,
  lastLoadedAt: 100,
  source: 'typed',
}

describe('draft storage codec', () => {
  it('round-trips a versioned draft payload', () => {
    const raw = serializeDraft(sampleDocument, 200)
    const restored = parseStoredDraft(raw)

    expect(restored).toEqual({
      ...sampleDocument,
      source: 'restored',
    })
  })

  it('rejects incompatible draft versions', () => {
    const incompatible = JSON.stringify({
      version: DRAFT_STORAGE_VERSION + 1,
      savedAt: 1,
      document: sampleDocument,
    })

    expect(parseStoredDraft(incompatible)).toBeNull()
  })

  it('rejects malformed draft payloads', () => {
    expect(parseStoredDraft('{not json')).toBeNull()
    expect(parseStoredDraft(null)).toBeNull()
  })
})
