// Dev helper: screenshots of the /design preview (desktop + 360px). Usage: node scripts/design-shots.mjs <outDir>
import { chromium } from 'playwright-core'
const out = process.argv[2]
const b = await chromium.launch({ channel: 'chrome' })
const errors = []
for (const [name, w, h] of [['desk', 1366, 900], ['mob', 360, 780]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  p.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text().slice(0, 200)}`))
  p.on('pageerror', (e) => errors.push(`${name} pageerror: ${e.message.slice(0, 200)}`))
  await p.goto((process.env.TEST_BASE || 'http://localhost:3101') + '/design', { waitUntil: 'networkidle' })
  await p.screenshot({ path: `${out}/${name}-top.png` })
  for (const id of ['tokens', 'buttons', 'forms', 'status', 'cards', 'tables', 'login', 'shell']) {
    await p.locator('#' + id).scrollIntoViewIfNeeded()
    await p.locator('#' + id).screenshot({ path: `${out}/${name}-${id}.png` })
  }
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  console.log(name, 'horizontal overflow px:', overflow)
  await p.close()
}
console.log(errors.length ? errors.join('\n') : 'no console errors')
await b.close()
