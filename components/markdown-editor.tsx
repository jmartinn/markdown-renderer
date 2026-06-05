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
    saveStatus,
    exportFileName,
    updateContent,
    openFile,
    exportDocument,
    clearNotice,
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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-[var(--md-radius-sm)] focus:border focus:border-[var(--md-border)] focus:bg-[var(--md-surface)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--md-body)] focus:outline-none focus:ring-2 focus:ring-[var(--md-focus)]"
      >
        Skip to content
      </a>
      <MarkdownToolbar
        view={view}
        document={document}
        wordCount={counts.words}
        characterCount={counts.characters}
        notice={notice}
        saveStatus={saveStatus}
        exportFileName={exportFileName}
        onViewChange={setView}
        onOpenFile={handleOpenFile}
        onExport={exportDocument}
        onClearNotice={clearNotice}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-col sm:flex-row flex-1 overflow-hidden outline-none"
      >
        {(view === "editor" || view === "split") && (
          <EditorPane content={document.content} view={view} onContentChange={updateContent} />
        )}

        {isPreviewVisible && (
          <PreviewPane content={deferredPreviewContent} view={view} isStale={isPreviewStale} />
        )}
      </main>

      <EditorFooter notice={notice} onClearNotice={clearNotice} />
      <DragDropOverlay isDragging={isDragging} />
      <ThemeToggle />
    </div>
  )
}
