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

// --- upload an image, then pick it in the builder ------------------------

console.log('\nupload a logo, then choose it in the builder')

// A tiny real PNG, written to disk so the admin's file input has something to
// take. Content does not matter; that it round-trips does.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAKUlEQVR42mNkYPjPwMDAyMDAwMgABYwMUMDIAAWMDFDAyAAFjAxQwMgABQBnAAeQm3rHAAAAAElFTkSuQmCC',
  'base64',
)
const upload = '/tmp/test-logo.png'
writeFileSync(upload, PNG)

await page.goto(`${BASE}/admin/collections/media/create`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)
const fileInput = page.locator('input[type=file]').first()
check((await fileInput.count()) > 0, 'the Media upload form is reachable')
await fileInput.setInputFiles(upload)
await page.waitForTimeout(1500)
const altField = page.locator('#field-alt')
if (await altField.count()) await altField.fill('Test logo')
await page.click('#action-save')
await page.waitForTimeout(5000)

const media = await (
  await ctx.request.get(`${BASE}/api/media?limit=5&sort=-createdAt`, { headers: { Origin: BASE } })
).json()
const uploaded = media.docs?.[0]
check(Boolean(uploaded?.url), 'the image uploaded and has a URL', uploaded?.url || 'none')

// Now pick it on the home page's Header block, through the picker.
const homeDoc = await (
  await ctx.request.get(`${BASE}/api/pages?where[slug][equals]=home`, { headers: { Origin: BASE } })
).json()
const homeId = homeDoc.docs?.[0]?.id

await page.goto(`${BASE}/builder/${homeId}`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=Components', { timeout: 90_000 })
await page.waitForTimeout(3000)

// Select the Header block by clicking the logo bar on the canvas.
await page.locator('.topbar').first().click()
await page.waitForTimeout(1500)
/**
 * Located by component, not by label text.
 *
 * Puck's external field labels its button with the placeholder when nothing is
 * chosen and with the selected item's summary afterwards — so matching "Choose
 * an image" passed on a fresh page and failed the second time the test ran,
 * which is a test bug, not a product one.
 */
const pickerButton = page.locator('[class*="ExternalInput"] button').first()
check((await pickerButton.count()) > 0, 'the Header block offers an image picker')

if ((await pickerButton.count()) > 0) {
  await pickerButton.click()
  await page.waitForTimeout(2500)
  const row = page.locator('tbody tr').first()
  const rows = await page.locator('tbody tr').count()
  check(rows > 0, 'the picker lists images from the Media library', `${rows} row(s)`)
  if (rows > 0) {
    await row.click()
    await page.waitForTimeout(2000)
    const onCanvas = await page.locator('.topbar img').count()
    check(onCanvas > 0, 'the chosen logo appears on the canvas')
  }
}

/**
 * Already-published pages show "Update live page" rather than "Publish" — the
 * editor labels the action by what it will do, so the test has to accept both.
 */
await page
  .locator('button')
  .filter({ hasText: /^(Publish|Update live page)$/ })
  .first()
  .click()
await page.waitForTimeout(4500)
check((await page.locator('text=Published.').count()) > 0, 'the page republishes')

const liveHome = await (await ctx.request.get(`${BASE}/`)).text()
check(
  uploaded?.url ? liveHome.includes(uploaded.url) : false,
  'the logo is on the live home page at /',
  uploaded?.url,
)

await browser.close()
console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
