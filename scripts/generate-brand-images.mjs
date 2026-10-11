// Renders the brand images once and writes them into app/ as static files (Next serves them via
// the file-based metadata convention). Run: npm run brand:images
//   app/opengraph-image.png, app/twitter-image.png  (1200x630 social card)
//   app/icon.png (512), app/apple-icon.png (180)
// Static PNGs mean no runtime image generation, no network, and no dependency on next/og.
import { readFileSync, writeFileSync } from 'node:fs'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

const root = new URL('../', import.meta.url)
// Static instance (satori cannot read variable fonts). Playfair Display is OFL-licensed.
const font = readFileSync(new URL('node_modules/@fontsource/playfair-display/files/playfair-display-latin-500-normal.woff', root))
const CREAM = '#F5F0E8', ESPRESSO = '#2C1810', TERRA = '#C4622D'

const h = (type, style, children) => ({ type, props: { style: { display: 'flex', ...style }, children } })

async function render(tree, width, height) {
  const svg = await satori(tree, { width, height, fonts: [{ name: 'Playfair', data: font, weight: 500, style: 'normal' }] })
  return new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng()
}

const social = h('div', {
  width: 1200, height: 630, boxSizing: 'border-box', flexDirection: 'column', justifyContent: 'space-between',
  background: CREAM, color: ESPRESSO, padding: '64px 80px 76px', fontFamily: 'Playfair',
}, [
  h('div', { alignItems: 'center' }, [
    h('div', { width: 56, height: 56, borderRadius: 14, background: ESPRESSO, color: CREAM, alignItems: 'center', justifyContent: 'center', fontSize: 34 }, 'N'),
    h('div', { marginLeft: 18, fontSize: 38 }, 'Nizamo'),
  ]),
  h('div', { flexDirection: 'column' }, [
    h('div', { fontSize: 80, lineHeight: 1.08, flexDirection: 'column' }, [
      h('div', {}, 'Pakistan ka school,'),
      h('div', { color: TERRA }, 'Pakistan ka system'),
    ]),
    h('div', { marginTop: 26, fontSize: 28, opacity: 0.72 }, 'School management for Pakistani schools'),
  ]),
  h('div', { position: 'absolute', left: 0, bottom: 0, width: '100%', height: 10, background: TERRA }, ''),
])

const mark = (size) =>
  h('div', { width: size, height: size, background: ESPRESSO, color: CREAM, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', fontFamily: 'Playfair' }, [
    h('div', { fontSize: Math.round(size * 0.62), lineHeight: 1 }, 'N'),
    h('div', { width: Math.round(size * 0.3), height: Math.max(4, Math.round(size * 0.028)), background: TERRA, borderRadius: 8, marginTop: Math.round(size * 0.02) }, ''),
  ])

const out = (name, buf) => { writeFileSync(new URL(`app/${name}`, root), buf); console.log('wrote app/' + name, buf.length + ' bytes') }

const og = await render(social, 1200, 630)
out('opengraph-image.png', og)
out('twitter-image.png', og)
out('icon.png', await render(mark(512), 512, 512))
out('apple-icon.png', await render(mark(180), 180, 180))
