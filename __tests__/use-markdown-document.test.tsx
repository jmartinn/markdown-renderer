import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMarkdownDocument } from '@/hooks/use-markdown-document'
import { serializeDraft } from '@/lib/draft-storage'
import {
  DRAFT_STORAGE_KEY,
  createSampleDocument,
  getExportFileName,
  type MarkdownDocument,
} from '@/lib/markdown-document'

describe('useMarkdownDocument', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('marks typed content as dirty and updates counts', () => {
    const { result } = renderHook(() => useMarkdownDocument({ storage: localStorage }))

    act(() => {
      result.current.updateContent('# Hello world')
    })

    expect(result.current.document.content).toBe('# Hello world')
    expect(result.current.document.dirty).toBe(true)
    expect(result.current.document.source).toBe('typed')
    expect(result.current.counts.words).toBe(3)
    expect(result.current.counts.characters).toBe(13)
  })

  it('opens supported Markdown files and resets dirty state', async () => {
    const { result } = renderHook(() => useMarkdownDocument({ storage: localStorage }))
    const file = new File(['# Uploaded'], 'notes.markdown', { type: 'text/markdown' })
    let opened = false

    await act(async () => {
      opened = await result.current.openFile(file)
    })

    expect(opened).toBe(true)
    expect(result.current.document.content).toBe('# Uploaded')
    expect(result.current.document.fileName).toBe('notes.markdown')
    expect(result.current.document.dirty).toBe(false)
    expect(result.current.document.source).toBe('uploaded')
    expect(result.current.notice?.type).toBe('info')
  })

  it('reports unsupported file extensions', async () => {
    const { result } = renderHook(() => useMarkdownDocument({ storage: localStorage }))
    const file = new File(['%PDF'], 'whitepaper.pdf', { type: 'application/pdf' })
    let opened = true

    await act(async () => {
      opened = await result.current.openFile(file)
    })

    expect(opened).toBe(false)
    expect(result.current.notice?.type).toBe('error')
    expect(result.current.notice?.message).toContain('.md, .markdown, .txt')
    expect(result.current.document.source).toBe('sample')
  })

  it('rejects files larger than the size limit', async () => {
    const { result } = renderHook(() => useMarkdownDocument({ storage: localStorage }))
    const file = new File(['oversized'], 'huge.md', { type: 'text/markdown' })
    Object.defineProperty(file, 'size', { configurable: true, value: 6 * 1024 * 1024 })
    let opened = true

    await act(async () => {
      opened = await result.current.openFile(file)
    })

    expect(opened).toBe(false)
    expect(result.current.notice?.type).toBe('error')
    expect(result.current.notice?.message).toContain('larger than 5 MB')
    expect(result.current.document.source).toBe('sample')
  })

  it('reports file-read failures without replacing the document', async () => {
    const { result } = renderHook(() => useMarkdownDocument({ storage: localStorage }))
    const file = new File(['# Broken'], 'broken.md', { type: 'text/markdown' })
    Object.defineProperty(file, 'text', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('read failed')),
    })
    let opened = true

    await act(async () => {
      opened = await result.current.openFile(file)
    })

    expect(opened).toBe(false)
    expect(result.current.notice?.type).toBe('error')
    expect(result.current.notice?.message).toContain('Could not read "broken.md"')
    expect(result.current.document.source).toBe('sample')
  })

  it('derives export filenames from the current document', async () => {
    const { result } = renderHook(() => useMarkdownDocument({ storage: localStorage }))
    const file = new File(['# Release'], 'release notes.txt', { type: 'text/plain' })

    await act(async () => {
      await result.current.openFile(file)
    })

    expect(result.current.exportFileName).toBe('release-notes.md')
    expect(getExportFileName({ fileName: 'folder/spec.markdown' })).toBe('spec.md')
  })

  it('restores a versioned localStorage draft', async () => {
    const draft: MarkdownDocument = {
      ...createSampleDocument(100),
      content: '# Restored draft',
      fileName: 'draft.md',
      dirty: true,
      source: 'typed',
    }
    localStorage.setItem(DRAFT_STORAGE_KEY, serializeDraft(draft, 200))

    const { result } = renderHook(() => useMarkdownDocument({ storage: localStorage }))

    await waitFor(() => {
      expect(result.current.document.source).toBe('restored')
    })

    expect(result.current.document.content).toBe('# Restored draft')
    expect(result.current.document.dirty).toBe(true)
    expect(result.current.notice?.message).toBe('Restored your last draft.')
  })

  it('persists typed drafts after storage restore completes', async () => {
    const { result } = renderHook(() => useMarkdownDocument({ storage: localStorage }))

    act(() => {
      result.current.updateContent('A saved draft')
    })

    await waitFor(() => {
      expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toContain('A saved draft')
    })
  })

  it('transitions saveStatus from unsaved to saved after the debounce', () => {
    vi.useFakeTimers()
    try {
      const { result } = renderHook(() => useMarkdownDocument({ storage: localStorage }))

      act(() => {
        result.current.updateContent('# Saved please')
      })
      expect(result.current.saveStatus).toBe('unsaved')

      act(() => {
        vi.advanceTimersByTime(400)
      })
      expect(result.current.saveStatus).toBe('saved')
      expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toContain('# Saved please')
    } finally {
      vi.useRealTimers()
    }
  })

  it('reports a quota failure once, then recovers on the next successful save', () => {
    vi.useFakeTimers()
    try {
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('full', 'QuotaExceededError')
      })
      const { result } = renderHook(() => useMarkdownDocument({ storage: localStorage }))

      act(() => {
        result.current.updateContent('# One')
      })
      act(() => {
        vi.advanceTimersByTime(400)
      })
      expect(result.current.saveStatus).toBe('error')
      expect(result.current.notice?.message).toBe('Your draft is too large to save in this browser.')

      // Dismiss the notice; a second failing cycle must not re-show it.
      act(() => {
        result.current.clearNotice()
      })
      act(() => {
        result.current.updateContent('# Two')
      })
      act(() => {
        vi.advanceTimersByTime(400)
      })
      expect(result.current.saveStatus).toBe('error')
      expect(result.current.notice).toBeNull()

      // Storage recovers: the next save succeeds.
      setItem.mockRestore()
      act(() => {
        result.current.updateContent('# Three')
      })
      act(() => {
        vi.advanceTimersByTime(400)
      })
      expect(result.current.saveStatus).toBe('saved')
    } finally {
      vi.useRealTimers()
    }
  })
})
