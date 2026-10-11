// Shared artwork for the generated brand images (OG/Twitter card, icon, apple icon).
// Rendered by next/og at build time; no runtime generation, no network.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'

const CREAM = '#F5F0E8', ESPRESSO = '#2C1810', TERRA = '#C4622D'

async function fonts() {
  // Static instance (satori cannot read variable fonts). Playfair Display is OFL-licensed.
  const file = path.join(process.cwd(), 'node_modules/@fontsource/playfair-display/files/playfair-display-latin-500-normal.woff')
  return [{ name: 'Playfair', data: await readFile(file), weight: 500, style: 'normal' }]
}

export async function socialCard() {
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: CREAM, color: ESPRESSO, padding: '64px 80px 76px', fontFamily: 'Playfair' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', width: 56, height: 56, borderRadius: 14, background: ESPRESSO, color: CREAM, alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>N</div>
          <div style={{ display: 'flex', marginLeft: 18, fontSize: 38 }}>Nizamo</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 80, lineHeight: 1.08, flexDirection: 'column' }}>
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

export async function markIcon(size) {
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: 'flex', background: ESPRESSO, color: CREAM, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', fontFamily: 'Playfair' }}>
        <div style={{ display: 'flex', fontSize: Math.round(size * 0.62), lineHeight: 1 }}>N</div>
        <div style={{ display: 'flex', width: Math.round(size * 0.3), height: Math.max(4, Math.round(size * 0.028)), background: TERRA, borderRadius: 8, marginTop: Math.round(size * 0.02) }} />
      </div>
    ),
    { width: size, height: size, fonts: await fonts() }
  )
}
