// Generated brand images (OG/Twitter card, favicon, apple icon), rendered by next/og at build time.
// The mark comes from lib/brand-mark.mjs, the same geometry as <Logo/>.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { COLORS, FULL, SIMPLE } from '@/lib/brand-mark.mjs'

const { espresso: ESPRESSO, terracotta: TERRA, cream: CREAM } = COLORS

async function fonts() {
  // Static instance (satori cannot read variable fonts). Playfair Display is OFL-licensed.
  const dir = path.join(process.cwd(), 'node_modules/@fontsource/playfair-display/files')
  const [w500, w600] = await Promise.all([
    readFile(path.join(dir, 'playfair-display-latin-500-normal.woff')),
    readFile(path.join(dir, 'playfair-display-latin-600-normal.woff')),
  ])
  return [
    { name: 'Playfair', data: w500, weight: 500, style: 'normal' },
    { name: 'Playfair', data: w600, weight: 600, style: 'normal' },
  ]
}

// The mark as an inline SVG. The pillar slots are painted in the background colour (cream here),
// because satori has no evenodd cut-outs; the images always sit on cream.
function Mark({ m, height }) {
  const width = (height * m.width) / m.height
  return (
    <svg width={width} height={height} viewBox={m.viewBox}>
      {m.parts.map((p, i) => (
        <path key={i} d={p.d} fill={p.c === 't' ? TERRA : ESPRESSO} />
      ))}
      <path d={m.pillar} fill={ESPRESSO} />
      {m.slots.map((d, i) => (
        <path key={i} d={d} fill={CREAM} />
      ))}
    </svg>
  )
}

function Wordmark({ size }) {
  return (
    <div style={{ display: 'flex', fontFamily: 'Playfair', fontWeight: 600, fontSize: size, color: ESPRESSO, lineHeight: 1, letterSpacing: -0.01 * size }}>
      <span>N</span>
      <span style={{ position: 'relative', display: 'flex' }}>
        <span>ı</span>
        <span style={{ position: 'absolute', left: size * 0.17, top: size * 0.18, width: size * 0.17, height: size * 0.17, borderRadius: 999, background: TERRA }} />
      </span>
      <span>zamo</span>
    </div>
  )
}

export async function socialCard() {
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: CREAM, color: ESPRESSO, padding: '64px 80px 76px', fontFamily: 'Playfair' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Mark m={FULL} height={64} />
          <div style={{ display: 'flex', marginLeft: 22 }}>
            <Wordmark size={46} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 80, fontWeight: 500, lineHeight: 1.08, flexDirection: 'column' }}>
            <div style={{ display: 'flex' }}>Pakistan ka school,</div>
            <div style={{ display: 'flex', color: TERRA }}>Pakistan ka system</div>
          </div>
          <div style={{ display: 'flex', marginTop: 26, fontSize: 28, opacity: 0.72 }}>School management for Pakistani schools</div>
        </div>
        <div style={{ display: 'flex', position: 'absolute', left: 0, bottom: 0, width: '100%', height: 10, background: TERRA }} />
      </div>
    ),
    { width: 1200, height: 630, fonts: await fonts() }
  )
}

// Favicon / app icon: the SIMPLIFIED mark on a cream tile. `radius` 0 = full-bleed (Apple rounds it itself).
export async function markIcon(size, radius = 0.22) {
  const markH = Math.round(size * 0.58)
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: CREAM, borderRadius: Math.round(size * radius) }}>
        <Mark m={SIMPLE} height={markH} />
      </div>
    ),
    { width: size, height: size }
  )
}
