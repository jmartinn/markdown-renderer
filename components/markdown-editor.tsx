"use client"

import { useCallback, useDeferredValue, useState } from "react"

import { DragDropOverlay } from "@/components/editor/drag-drop-overlay"
import { EditorFooter } from "@/components/editor/editor-footer"
import { EditorPane } from "@/components/editor/editor-pane"
import { MarkdownToolbar, type EditorView } from "@/components/editor/markdown-toolbar"
import { PreviewPane } from "@/components/editor/preview-pane"
import { ThemeToggle } from "@/components/editor/theme-toggle"
import { useDragDrop } from "@/hooks/use-drag-drop"
import { useMarkdownDocument } from "@/hooks/use-markdown-document"

export function MarkdownEditor() {
  const [view, setView] = useState<EditorView>("split")
  const {
    document,
    counts,
    notice,
    exportFileName,
    updateContent,
    openFile,
    exportDocument,
  } = useMarkdownDocument()

  const handleOpenFile = useCallback(
    (file: File | undefined) => {
      void openFile(file)
    },
    [openFile]
  )

  const { isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop } = useDragDrop({
    onFileDrop: handleOpenFile,
  })

  const isPreviewVisible = view === "preview" || view === "split"
  const previewInput = isPreviewVisible ? document.content : ""
  const deferredPreviewContent = useDeferredValue(previewInput)
  const isPreviewStale = isPreviewVisible && previewInput !== deferredPreviewContent

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
