import { createElement } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MarkdownRenderer } from '@/components/markdown-renderer'
import { extractTextFromReactNode, parseCodeLanguage } from '@/lib/markdown-rendering'

describe('MarkdownRenderer', () => {
  it('renders links, images, tables, and task lists', () => {
    render(
      <MarkdownRenderer
        content={`# Release Notes

| Item | Status |
| --- | --- |
| Tables | Done |

[CommonMark](https://commonmark.org)

![Architecture diagram](https://example.com/diagram.png)

- [x] Shipped
- [ ] Pending`}
      />
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Release Notes' })).toBeDefined()
    expect(screen.getByRole('table')).toBeDefined()

    const link = screen.getByRole('link', { name: 'CommonMark' })
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')

    const image = screen.getByRole('img', { name: 'Architecture diagram' })
    expect(image.getAttribute('loading')).toBe('lazy')
    expect(image.getAttribute('referrerpolicy')).toBe('no-referrer')

    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  })

  it('copies raw fenced-code text after syntax highlighting', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(
      <MarkdownRenderer
        content={`\`\`\`ts
const answer = 42
\`\`\``}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('const answer = 42'))
    })
  })

  it('renders malformed Markdown without throwing', () => {
    expect(() => {
      render(<MarkdownRenderer content={'# Broken [link\n\n| a | b\n| ---'} />)
    }).not.toThrow()

    expect(screen.getByRole('heading', { level: 1 })).toBeDefined()
  })

  it('renders an unlabeled fenced block as a block, not an inline chip', () => {
    const { container } = render(<MarkdownRenderer content={'```\nplain text\n```'} />)

    const code = container.querySelector('pre code')
    expect(code).not.toBeNull()
    expect(code?.className ?? '').not.toContain('inline-block')
    expect(screen.getByText('plain')).toBeDefined()
  })

  it('renders inline code as a styled chip', () => {
    const { container } = render(<MarkdownRenderer content={'Run `pnpm dev` to start.'} />)

    const code = container.querySelector('p code')
    expect(code?.className ?? '').toContain('inline-block')
  })
})

describe('Markdown rendering helpers', () => {
  it('parses fenced-code languages from highlighted class names', () => {
    expect(parseCodeLanguage('hljs language-typescript')).toBe('typescript')
    expect(parseCodeLanguage('language-shell')).toBe('shell')
    expect(parseCodeLanguage('hljs')).toBeNull()
    expect(parseCodeLanguage(undefined)).toBeNull()
  })

  it('extracts text from nested highlighted React nodes', () => {
    const node = [
      'const ',
      createElement('span', { key: 'name', className: 'hljs-title' }, 'answer'),
      ' = ',
      createElement('span', { key: 'value', className: 'hljs-number' }, '42'),
    ]

    expect(extractTextFromReactNode(node)).toBe('const answer = 42')
  })

  it('falls back to stripped text for dangerous HTML nodes', () => {
    const node = createElement('span', {
      dangerouslySetInnerHTML: { __html: '<span>copied</span>' },
    })

    expect(extractTextFromReactNode(node)).toBe('copied')
  })
})
