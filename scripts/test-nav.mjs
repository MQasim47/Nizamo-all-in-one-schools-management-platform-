// Regression test: client-side navigation back to the homepage must never leave it blank.
// Needs a running server and Chrome or Edge installed:
//   npm run dev -- -p 3100   then   TEST_BASE=http://localhost:3100 npm run test:nav
import { chromium } from 'playwright-core'

const BASE = process.env.TEST_BASE || 'http://localhost:3100'
let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + extra}`) }

let browser
for (const channel of ['chrome', 'msedge']) {
  try { browser = await chromium.launch({ channel }); break } catch {}
}
if (!browser) { console.error('No Chrome/Edge found'); process.exit(1) }

// Count of .reveal blocks that never got revealed after scrolling the whole page (so the observer has had its say).
async function hiddenReveals(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) }
  })
  await page.waitForTimeout(1000)
  return page.evaluate(() => [...document.querySelectorAll('.nz-home .reveal')].filter((el) => !el.classList.contains('in')).length)
}
const visibleNow = (page, sel) =>
  page.evaluate((s) => { const el = document.querySelector(s); if (!el) return false; const r = el.getBoundingClientRect(); return getComputedStyle(el).opacity === '1' && r.height > 0 && r.top < innerHeight && r.bottom > 0 }, sel)

try {
  for (const [label, linkSel, after] of [
    ['logo link to /', '.nz-home a[href="/"]', async (p) => check('  heading visible', await visibleNow(p, 'h1'))],
    ['link to /#waitlist', '.nz-home a[href="/#waitlist"]', async (p) => {
      await p.waitForTimeout(1200)
      check('  URL has #waitlist', p.url().endsWith('/#waitlist'), p.url())
      check('  waitlist section visible in viewport', await visibleNow(p, '#waitlist'))
    }],
  ]) {
    for (const from of ['/register', '/privacy']) {
      const page = await browser.newPage()
      await page.goto(BASE + from, { waitUntil: 'networkidle' })
      await page.locator(linkSel).first().click()
      await page.waitForURL((u) => u.pathname === '/')
      await page.waitForTimeout(800)
      check(`${from} -> ${label}: homepage has content`, await page.locator('h1').first().isVisible())
      await after(page)
      const hidden = await hiddenReveals(page)
      check(`${from} -> ${label}: no section stays hidden after scrolling`, hidden === 0, `${hidden} hidden`)
      await page.close()
    }
  }
  // Round trip: / -> /privacy -> back in history
  const page = await browser.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.locator('.nz-home footer a[href="/privacy"]').first().click()
  await page.waitForURL('**/privacy')
  await page.goBack()
  await page.waitForURL((u) => u.pathname === '/')
  await page.waitForTimeout(800)
  check('browser Back to / keeps content visible', (await hiddenReveals(page)) === 0)
  await page.close()
} catch (e) {
  fail++; console.log('TEST ERROR:', e.message)
}
await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
