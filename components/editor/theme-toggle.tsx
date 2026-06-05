'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  // theme is unknown during SSR. We always render the fixed button shell (so
  // its layout never shifts), and only reveal the theme-dependent icon/labels
  // after mount to avoid a hydration mismatch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), [])

  const cycle = () => {
    const options = ['light', 'dark', 'system']
    const next = options[(options.indexOf(theme ?? 'system') + 1) % options.length]
    setTheme(next)
  }

  return (
    <button
      onClick={cycle}
      aria-label={mounted ? `Current theme: ${theme}. Click to cycle themes.` : 'Toggle theme'}
      title={mounted ? `Theme: ${theme}` : undefined}
      className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-9 h-9 rounded-full border border-[var(--md-border)] bg-[var(--md-surface)] shadow-md hover:bg-[var(--md-hover)] transition-[background-color,box-shadow,transform] duration-150 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-focus)]"
    >
      {/* Keyed so the icon remounts and animates in on each theme change. */}
      <span
        key={mounted ? (theme === 'system' ? 'system' : resolvedTheme) : 'pending'}
        className="flex animate-in fade-in zoom-in-75 duration-200 ease-[var(--ease-out-cubic)]"
      >
        {!mounted ? (
          <span className="w-[15px] h-[15px]" aria-hidden="true" />
        ) : theme === 'system' ? (
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <rect x="1" y="1.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" className="text-[var(--md-body)]" />
            <path d="M5 13.5h5M7.5 10.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-[var(--md-body)]" />
          </svg>
        ) : resolvedTheme === 'dark' ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M12.5 9.5A6 6 0 1 1 4.5 1.5a4.5 4.5 0 0 0 8 8z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" className="text-[var(--md-body)]" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.2" className="text-[var(--md-body)]" />
            <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.93 2.93l1.06 1.06M11.01 11.01l1.06 1.06M2.93 12.07l1.06-1.06M11.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-[var(--md-body)]" />
          </svg>
        )}
      </span>
    </button>
  )
}
