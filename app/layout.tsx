import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import dynamic from 'next/dynamic'
import { Providers } from '@/app/providers'
import './globals.css'

// Code-split analytics into its own chunk; it's only rendered on Vercel, so
// non-Vercel builds never load it at all.
const Analytics = dynamic(() => import('@vercel/analytics/next').then((m) => m.Analytics))

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const description = 'Edit Markdown locally and preview GitHub-flavored output with syntax highlighting, file import, export, and dark mode.'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Markdown Renderer',
    template: '%s | Markdown Renderer',
  },
  description,
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  applicationName: 'Markdown Renderer',
  authors: [{ name: 'jmartinn', url: 'https://jmartinn.com/' }],
  creator: 'jmartinn',
  publisher: 'jmartinn',
  keywords: ['Markdown editor', 'Markdown preview', 'GitHub Flavored Markdown', 'syntax highlighting'],
  openGraph: {
    title: 'Markdown Renderer',
    description,
    type: 'website',
    siteName: 'Markdown Renderer',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title: 'Markdown Renderer',
    description,
  },
  icons: {
    shortcut: '/favicon.ico',
    icon: [
      { url: '/icon-light-32x32.png', type: 'image/png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', type: 'image/png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

// Match the browser chrome to the page background per theme. Use hex here (not
// the oklch design tokens) since several browsers won't parse oklch() in the
// theme-color meta tag.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        {process.env.VERCEL === '1' && <Analytics />}
      </body>
    </html>
  )
}
