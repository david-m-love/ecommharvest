/**
 * The editing loop, in a real browser: brand colours, logo upload, and editing
 * the two pages that own their own URL.
 *
 *   npm run dev   (in another terminal, migrated)
 *   npm run test:styles
 *
 * These are the claims worth executing, because each one is invisible until it
 * is wrong on a live page:
 *
 *   - Changing a colour in Site Styles changes it on the public page, with no
 *     deploy and nothing per-block to touch.
 *   - An image uploaded under Media can be picked in the builder and appears in
 *     the published page's markup.
 *   - `/` and `/masterclass` are page-builder pages: editable, republishable,
 *     and their edits show at those exact URLs rather than under /p/.
 */

import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
const ADMIN = process.env.SEED_ADMIN_EMAIL || 'david@lovemarketing.digital'
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'change-me-locally-8f2a'

let passed = 0
let failed = 0
const check = (ok, label, detail = '') => {
  console.log(`${ok ? ' ok ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`)
  ok ? passed++ : failed++
}

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
)
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

console.log('sign in')
await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' })
await page.fill('#field-email', ADMIN)
await page.fill('#field-password', PASSWORD)
await page.click('button[type=submit]')
await page.waitForURL(/\/admin(?!\/login)/, { timeout: 90_000 })
check(true, 'signed in')

// --- the two pages own their own URLs ------------------------------------

console.log('\n/ and /masterclass are builder pages')
for (const [slug, path] of [
  ['home', '/'],
  ['masterclass', '/masterclass'],
]) {
  const res = await ctx.request.get(`${BASE}/api/pages?where[slug][equals]=${slug}`, {
    headers: { Origin: BASE },
  })
  const doc = (await res.json()).docs?.[0]
  check(Boolean(doc), `a "${slug}" page exists`, doc ? `${doc.content?.content?.length} blocks` : 'missing')
  check(doc?.status === 'published', `"${slug}" is published`, doc?.status)

  // One address per page: /p/<slug> must not serve a second copy.
  const dup = await ctx.request.get(`${BASE}/p/${slug}`, { maxRedirects: 0 }).catch(() => null)
  check(
    !dup || dup.status() === 308 || dup.status() === 301,
    `/p/${slug} redirects rather than duplicating`,
    dup ? String(dup.status()) : 'no response',
  )

  const live = await ctx.request.get(`${BASE}${path}`)
  const html = await live.text()
  check(live.status() === 200, `${path} renders`, String(live.status()))
  // The generated block embeds the logo as a data: URI; the builder page does
  // not. That is the cheapest reliable way to tell which one served the page.
  check(!html.includes('data:image/png;base64'), `${path} is served by the builder, not the block`)
}

// --- brand colours are global -------------------------------------------

console.log('\nSite Styles: one colour change reaches every page')

const buttonColourBefore = await (async () => {
  const p = await ctx.newPage()
  await p.goto(`${BASE}/`, { waitUntil: 'load' })
  const c = await p.evaluate(() => {
    const b = document.querySelector('.btn')
    return b ? getComputedStyle(b).backgroundColor : null
  })
  await p.close()
  return c
})()
check(buttonColourBefore === 'rgb(201, 145, 50)', 'buttons start brand gold', `${buttonColourBefore}`)

// Change the accent through the admin form, exactly as a person would.
const TEST_COLOUR = '#1E7A46'
await page.goto(`${BASE}/admin/globals/site-styles`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('input[name="gold"]', { timeout: 60_000 })
await page.fill('input[name="gold"]', TEST_COLOUR)
// Payload's global edit view has no submit button — the Save control is
// `#action-save`, a plain button wired up in JS.
await page.click('#action-save')
await page.waitForTimeout(3500)

const afterPage = await ctx.newPage()
await afterPage.goto(`${BASE}/`, { waitUntil: 'load' })
await afterPage.waitForTimeout(500)
const buttonColourAfter = await afterPage.evaluate(() => {
  const b = document.querySelector('.btn')
  return b ? getComputedStyle(b).backgroundColor : null
})
check(
  buttonColourAfter === 'rgb(30, 122, 70)',
  'the new colour is live on the home page',
  `${buttonColourAfter}`,
)

// And on the other page, without touching it.
await afterPage.goto(`${BASE}/masterclass`, { waitUntil: 'load' })
await afterPage.waitForTimeout(500)
const mcColour = await afterPage.evaluate(() => {
  const b = document.querySelector('.btn')
  return b ? getComputedStyle(b).backgroundColor : null
})
check(mcColour === 'rgb(30, 122, 70)', 'and on /masterclass, with no edit to that page', `${mcColour}`)

// A bad value must be refused, not silently written into a <style> tag.
await page.goto(`${BASE}/admin/globals/site-styles`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('input[name="gold"]', { timeout: 60_000 })
await page.fill('input[name="gold"]', 'red; }')
await page.click('#action-save')
await page.waitForTimeout(3000)
const stillGreen = await (async () => {
  const p = await ctx.newPage()
  await p.goto(`${BASE}/`, { waitUntil: 'load' })
  const c = await p.evaluate(() => {
    const b = document.querySelector('.btn')
    return b ? getComputedStyle(b).backgroundColor : null
  })
  await p.close()
  return c
})()
check(stillGreen === 'rgb(30, 122, 70)', 'a non-hex colour is refused and the page is unharmed', `${stillGreen}`)

// Put it back.
await page.goto(`${BASE}/admin/globals/site-styles`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('input[name="gold"]', { timeout: 60_000 })
await page.fill('input[name="gold"]', '#C99132')
await page.click('#action-save')
await page.waitForTimeout(3500)
const restored = await (async () => {
  const p = await ctx.newPage()
  await p.goto(`${BASE}/`, { waitUntil: 'load' })
  const c = await p.evaluate(() => {
    const b = document.querySelector('.btn')
    return b ? getComputedStyle(b).backgroundColor : null
  })
  await p.close()
  return c
})()
check(restored === 'rgb(201, 145, 50)', 'and it can be changed back', `${restored}`)

/**
 * Uploading a logo and putting it on the pages is covered by test:logo.
 *
 * It used to be tested here by driving the Header block's own image picker.
 * That picker is gone: having a logo on the block *and* a size in Site Styles
 * meant the logo was neither global nor local, and no one could predict what
 * changing either would do. The logo is now one thing in one place, and
 * test:logo measures it on every page.
 */

await browser.close()
console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
