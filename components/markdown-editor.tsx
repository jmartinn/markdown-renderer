"use client"

import { useCallback, useDeferredValue, useRef, useState } from "react"
import type { DragEvent } from "react"

import { DragDropOverlay } from "@/components/editor/drag-drop-overlay"
import { EditorFooter } from "@/components/editor/editor-footer"
import { EditorPane } from "@/components/editor/editor-pane"
import { MarkdownToolbar } from "@/components/editor/markdown-toolbar"
import { PreviewPane } from "@/components/editor/preview-pane"
import type { EditorView } from "@/components/editor/view-types"
import { ThemeToggle } from "@/components/theme-provider"
import { useMarkdownDocument } from "@/hooks/use-markdown-document"

function dragEventIncludesFiles(event: DragEvent): boolean {
  return event.dataTransfer.types.includes("Files")
}

export function MarkdownEditor() {
  const [view, setView] = useState<EditorView>("split")
  const [isDragging, setIsDragging] = useState(false)
  const dragDepth = useRef(0)
  const {
    document,
    counts,
    notice,
    exportFileName,
    updateContent,
    openFile,
    exportDocument,
  } = useMarkdownDocument()

  const isPreviewVisible = view === "preview" || view === "split"
  const previewInput = isPreviewVisible ? document.content : ""
  const deferredPreviewContent = useDeferredValue(previewInput)
  const isPreviewStale = isPreviewVisible && previewInput !== deferredPreviewContent

  const handleOpenFile = useCallback(
    (file: File | undefined) => {
      void openFile(file)
    },
    [openFile]
  )

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
      void openFile(event.dataTransfer.files[0])
    },
    [openFile]
  )

  return (
    <div
      className="relative flex flex-col h-dvh bg-[var(--md-bg)] text-[var(--md-body)] font-sans"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      <MarkdownToolbar
        view={view}
        document={document}
        wordCount={counts.words}
        characterCount={counts.characters}
        notice={notice}
        exportFileName={exportFileName}
        onViewChange={setView}
        onOpenFile={handleOpenFile}
        onExport={exportDocument}
      />

      <main className="flex flex-col sm:flex-row flex-1 overflow-hidden">
        {(view === "editor" || view === "split") && (
          <EditorPane content={document.content} view={view} onContentChange={updateContent} />
        )}

        {isPreviewVisible && (
          <PreviewPane content={deferredPreviewContent} view={view} isStale={isPreviewStale} />
        )}
      </main>

      <EditorFooter notice={notice} />
      <DragDropOverlay isDragging={isDragging} />
      <ThemeToggle />
    </div>
  )
}
