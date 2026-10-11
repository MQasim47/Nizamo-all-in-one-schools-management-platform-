// Dev helper: node scripts/shot-one.mjs <url> <selector|-> <out.png> [width]
import { chromium } from 'playwright-core'
const [url, sel, out, w] = process.argv.slice(2)
const b = await chromium.launch({ channel: 'chrome' })
const p = await b.newPage({ viewport: { width: Number(w) || 1366, height: 900 }, deviceScaleFactor: 2 })
await p.goto(url, { waitUntil: 'networkidle' })
if (sel && sel !== '-') { await p.locator(sel).scrollIntoViewIfNeeded(); await p.locator(sel).screenshot({ path: out }) } else await p.screenshot({ path: out })
await b.close()
