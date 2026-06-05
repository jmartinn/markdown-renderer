import { describe, expect, it } from 'vitest'

import {
  classifyStorageError,
  describeSaveError,
  parseStoredDraft,
  serializeDraft,
} from '@/lib/draft-storage'
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

  it('rejects drafts whose document fields have the wrong shape', () => {
    const base = { version: DRAFT_STORAGE_VERSION, savedAt: 1 }

    expect(parseStoredDraft(JSON.stringify(base))).toBeNull()
    expect(
      parseStoredDraft(JSON.stringify({ ...base, document: { ...sampleDocument, content: 123 } }))
    ).toBeNull()
    expect(
      parseStoredDraft(JSON.stringify({ ...base, document: { ...sampleDocument, dirty: 'yes' } }))
    ).toBeNull()
    expect(
      parseStoredDraft(
        JSON.stringify({ ...base, document: { ...sampleDocument, lastLoadedAt: 'soon' } })
      )
    ).toBeNull()
  })
})

describe('storage failure classification', () => {
  it('classifies a QuotaExceededError by name', () => {
    expect(classifyStorageError(new DOMException('nope', 'QuotaExceededError'))).toBe('quota')
  })

  it('classifies a quota error by its legacy numeric code', () => {
    const error = new DOMException('nope')
    Object.defineProperty(error, 'code', { value: 22 })
    expect(classifyStorageError(error)).toBe('quota')
  })

  it('treats any other error as unknown', () => {
    expect(classifyStorageError(new Error('boom'))).toBe('unknown')
    expect(classifyStorageError('not even an error')).toBe('unknown')
  })

  it('maps each reason to its message', () => {
    expect(describeSaveError('quota')).toBe('Your draft is too large to save in this browser.')
    expect(describeSaveError('unknown')).toBe('Draft changes could not be saved in this browser.')
  })
})
