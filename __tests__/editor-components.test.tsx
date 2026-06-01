import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DragDropOverlay } from '@/components/editor/drag-drop-overlay'
import { MarkdownToolbar } from '@/components/editor/markdown-toolbar'
import { PreviewPane } from '@/components/editor/preview-pane'
import { ThemeProvider, ThemeToggle } from '@/components/theme-provider'
import { createSampleDocument } from '@/lib/markdown-document'

describe('editor UI components', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('switches toolbar views and renders document counts', () => {
    const onViewChange = vi.fn()

    render(
      <MarkdownToolbar
        view="split"
        document={createSampleDocument()}
        wordCount={2}
        characterCount={11}
        notice={null}
        exportFileName="document.md"
        onViewChange={onViewChange}
        onOpenFile={vi.fn()}
        onExport={vi.fn()}
      />
    )

    expect(screen.getByText('2 words · 11 chars')).toBeDefined()
    fireEvent.click(screen.getByRole('radio', { name: 'preview' }))

    expect(onViewChange).toHaveBeenCalledWith('preview')
  })

  it('renders empty preview copy and stale preview status', () => {
    render(<PreviewPane content="" view="preview" isStale />)

    expect(screen.getByText('Updating preview…')).toBeDefined()
    expect(screen.getByText('Nothing to preview yet. Start writing Markdown in the editor.')).toBeDefined()
  })

  it('renders the drag-and-drop overlay only while dragging', () => {
    const { rerender } = render(<DragDropOverlay isDragging={false} />)

    expect(screen.queryByText('Drop to open')).toBeNull()

    rerender(<DragDropOverlay isDragging />)

    expect(screen.getByText('Drop to open')).toBeDefined()
    expect(screen.getByText('Markdown or text file')).toBeDefined()
  })

  it('exposes an accessible theme toggle label after mount', async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ThemeToggle />
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('button').getAttribute('aria-label')).toContain('Current theme:')
    })

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('button').getAttribute('aria-label')).toContain('light')
    })
  })
})
