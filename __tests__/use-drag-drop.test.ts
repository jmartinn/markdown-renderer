import { act, renderHook } from '@testing-library/react'
import type { DragEvent as ReactDragEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { dragEventIncludesFiles, useDragDrop } from '@/hooks/use-drag-drop'

function createDragEvent(types: string[], files: File[] = []): ReactDragEvent<HTMLDivElement> {
  return {
    dataTransfer: {
      types,
      files,
    },
    preventDefault: vi.fn(),
  } as unknown as ReactDragEvent<HTMLDivElement>
}

describe('dragEventIncludesFiles', () => {
  it('returns true when the drag payload includes files', () => {
    expect(dragEventIncludesFiles(createDragEvent(['Files']))).toBe(true)
  })

  it('returns false for non-file drags', () => {
    expect(dragEventIncludesFiles(createDragEvent(['text/plain']))).toBe(false)
  })
})

describe('useDragDrop', () => {
  it('tracks nested drag enter and leave depth', () => {
    const onFileDrop = vi.fn()
    const { result } = renderHook(() => useDragDrop({ onFileDrop }))

    act(() => {
      result.current.handleDragEnter(createDragEvent(['Files']))
      result.current.handleDragEnter(createDragEvent(['Files']))
    })

    expect(result.current.isDragging).toBe(true)

    act(() => {
      result.current.handleDragLeave(createDragEvent(['Files']))
    })

    expect(result.current.isDragging).toBe(true)

    act(() => {
      result.current.handleDragLeave(createDragEvent(['Files']))
    })

    expect(result.current.isDragging).toBe(false)
  })

  it('drops the first file and resets drag state', () => {
    const file = new File(['# Hello'], 'hello.md', { type: 'text/markdown' })
    const onFileDrop = vi.fn()
    const { result } = renderHook(() => useDragDrop({ onFileDrop }))

    act(() => {
      result.current.handleDragEnter(createDragEvent(['Files']))
    })

    act(() => {
      result.current.handleDrop(createDragEvent(['Files'], [file]))
    })

    expect(onFileDrop).toHaveBeenCalledWith(file)
    expect(result.current.isDragging).toBe(false)
  })

  it('ignores drags that do not include files', () => {
    const onFileDrop = vi.fn()
    const { result } = renderHook(() => useDragDrop({ onFileDrop }))

    act(() => {
      result.current.handleDragEnter(createDragEvent(['text/plain']))
      result.current.handleDrop(createDragEvent(['text/plain']))
    })

    expect(result.current.isDragging).toBe(false)
    expect(onFileDrop).not.toHaveBeenCalled()
  })
})
