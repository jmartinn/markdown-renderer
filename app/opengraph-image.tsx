import { ImageResponse } from 'next/og'

export const alt = 'Markdown Renderer — edit Markdown locally and preview GitHub-flavored output'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '96px',
          background: '#0a0a0a',
          color: '#fafafa',
          fontFamily: 'sans-serif',
        }}
      >
        <svg width="72" height="62" viewBox="0 0 76 65" fill="#fafafa">
          <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
        </svg>
        <div style={{ marginTop: 40, fontSize: 76, fontWeight: 600, letterSpacing: '-0.03em' }}>
          Markdown Renderer
        </div>
        <div style={{ marginTop: 24, fontSize: 32, color: '#a1a1a1', maxWidth: 880 }}>
          Edit Markdown locally and preview GitHub-flavored output with syntax highlighting.
        </div>
      </div>
    ),
    { ...size }
  )
}
