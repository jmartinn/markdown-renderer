"use client"

import { useCallback, useRef, useState } from "react"
import type { DragEvent } from "react"

export function dragEventIncludesFiles(event: DragEvent): boolean {
  return event.dataTransfer.types.includes("Files")
}

interface UseDragDropOptions {
  onFileDrop: (file: File | undefined) => void
}

export function useDragDrop({ onFileDrop }: UseDragDropOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const dragDepth = useRef(0)

  const handleDragEnter = useCallback((event: DragEvent) => {
    if (!dragEventIncludesFiles(event)) return

    event.preventDefault()
    dragDepth.current += 1
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((event: DragEvent) => {
    if (!dragEventIncludesFiles(event)) return

    event.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((event: DragEvent) => {
    if (dragEventIncludesFiles(event)) event.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent) => {
      if (!dragEventIncludesFiles(event)) return

      event.preventDefault()
      dragDepth.current = 0
      setIsDragging(false)
      onFileDrop(event.dataTransfer.files[0])
    },
    [onFileDrop]
  )

  return {
    isDragging,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  }
}
