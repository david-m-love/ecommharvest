/**
 * The Founder Roadmap pages, in a real browser.
 *
 *   npm run dev   (in another terminal, migrated)
 *   npm run test:roadmap
 *
 * The three pages ship as drafts, so a 404 here means "not published yet" and is
 * reported rather than failed; once published this checks the rules a sales page
 * can break without anybody noticing: a button that goes two places, a page that
 * pushes sideways on a phone, a button too small to tap, a dash in the title.
 */
import { chromium } from 'playwright'

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
let passed = 0
let failed = 0
const check = (ok, label, detail = '') => {
  console.log(`${ok ? ' ok ' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`)
  ok ? passed++ : failed++
}

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
)

for (const [device, viewport] of [
  ['desktop', { width: 1280, height: 900 }],
  ['phone', { width: 390, height: 844 }],
]) {
  const page = await (await browser.newContext({ viewport })).newPage()
  for (const path of ['/roadmap', '/roadmap/preview', '/roadmap/thanks']) {
    console.log(`\n${path} on ${device}`)
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'load' })
    if (res?.status() === 404) {
      check(true, 'still a draft, publish it in the builder to test it live', '404')
      continue
    }
    check(res?.status() === 200, 'answers')

    const info = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      title: document.title,
      html: document.documentElement.outerHTML,
      wrapper: Boolean(document.querySelector('.page-roadmap')),
      h1s: document.querySelectorAll('h1').length,
      robots: document.querySelector('meta[name=robots]')?.content || '',
      buttons: [...document.querySelectorAll('a.btn')].map((b) => ({
        href: b.getAttribute('href') || '',
        h: b.getBoundingClientRect().height,
        w: b.getBoundingClientRect().width,
      })),
    }))

    check(info.wrapper, 'scoped to the Roadmap styles')
    check(info.h1s === 1, 'one h1')
    check(info.overflow <= 0, 'does not push sideways', `${info.overflow}px`)
    check(!/[–—]/.test(info.html), 'no em or en dash anywhere in the page')
    check(!info.title.includes('—') && info.title.endsWith('| eCommHarvest'), 'title is the deck title, not the site template', info.title)
    check(info.buttons.every((b) => b.h >= 48), 'every button is at least 48px tall')
    if (device === 'phone') {
      check(info.buttons.every((b) => b.w >= 390 - 60), 'buttons are full width on a phone')
    }
    const offsite = info.buttons.filter((b) => b.href && !b.href.startsWith('#') && !b.href.startsWith('/'))
    check(offsite.length <= 1, 'at most one button leaves the site', offsite.map((b) => b.href).join(', '))
    if (path === '/roadmap/thanks') check(/noindex/.test(info.robots), 'the thank-you page is not indexed')
  }
}

await browser.close()
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
