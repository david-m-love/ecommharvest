/**
 * Drives the page builder in a real browser.
 *
 *   npm run dev   (in another terminal, with a seeded database)
 *   npm run test:builder:ui
 *
 * The HTTP suite cannot reach the thing that matters most here: that a person
 * can sign in, drag a block onto a canvas, edit its text, and see that text on
 * the public page. It also covers the one behaviour the HTTP suite proved it
 * could not — that a block's `defaultProps` become real saved content, because
 * it is the editor, not the renderer, that materialises them.
 *
 * If your Chromium is not the build Playwright expects:
 *   PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome npm run test:builder:ui
 */

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

/**
 * Collect page errors as we go. A React error inside the canvas leaves the
 * builder looking fine and quietly breaks saving, so silence matters as much as
 * any assertion below.
 *
 * Requests to fonts.googleapis.com are ignored: they fail in sandboxes with no
 * outbound network and have nothing to do with the builder.
 */
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 160)}`))
page.on('console', (m) => {
  if (m.type() !== 'error') return
  const text = m.text()
  /**
   * Skip network failures here and let the response handler below report them.
   *
   * A console message for a failed request does not name the URL — it is just
   * "Failed to load resource: the server responded with a status of 404" — so it
   * cannot be filtered accurately and cannot be diagnosed either. It sent this
   * test chasing a phantom until the URL turned out to be a missing favicon.
   */
  if (/Failed to load resource|ERR_TUNNEL|ERR_CONNECTION|net::/i.test(text)) return
  errors.push(`console: ${text.slice(0, 160)}`)
})
/**
 * Failed requests, with their URLs. Font requests are ignored because they fail
 * in a sandbox with no outbound network and have nothing to do with the builder.
 */
page.on('response', (r) => {
  if (r.status() < 400) return
  const url = r.url()
  if (/fonts\.googleapis|fonts\.gstatic/i.test(url)) return
  errors.push(`${r.status()} ${url.replace(BASE, '')}`)
})

// --- sign in through the real admin form --------------------------------

console.log('sign in')
await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' })
await page.fill('#field-email', ADMIN)
await page.fill('#field-password', PASSWORD)
await page.click('button[type=submit]')
await page.waitForURL(/\/admin(?!\/login)/, { timeout: 90_000 })
check(true, 'email and password sign in works', page.url().replace(BASE, ''))

check(
  (await page.locator('text=Page builder').count()) > 0,
  'the admin sidebar links to the page builder',
)
check((await page.locator('.nav a:has-text("Pages")').count()) > 0, 'Pages is in the admin nav')
check((await page.locator('.nav a:has-text("Roles")').count()) > 0, 'Roles is in the admin nav')

// --- create a page ------------------------------------------------------

console.log('\ncreate a page')
await page.goto(`${BASE}/builder`, { waitUntil: 'domcontentloaded' })
await page.click('button:has-text("New page")')
await page.waitForURL(/\/builder\/\d+$/, { timeout: 60_000 })
const pageId = Number(page.url().split('/').pop())
check(Number.isFinite(pageId), 'the New page button opens the canvas', `id ${pageId}`)

// Puck needs a moment to mount its drag context and materialise defaults.
await page.waitForSelector('text=Components', { timeout: 60_000 })
await page.waitForTimeout(3000)

const drawer = await page.locator('text=Hero').count()
check(drawer > 0, 'the block library is listed')
for (const label of ['Hosted-by bar', 'Dark feature card', 'Bullet list', 'Formula bar', 'Row of cards', 'Speakers', 'Call to action card', 'Footer']) {
  check((await page.locator(`text=${label}`).count()) > 0, `"${label}" is available`)
}

/**
 * A new page opens as a working page, not an empty canvas. This is the
 * preset-library claim, checked against what is actually on screen.
 */
const canvasText = await page.locator('body').innerText()
check(
  canvasText.includes('Your Q4 Revenue Playbook'),
  'a new page starts with real content, not a blank canvas',
)

// --- edit a block by clicking it ---------------------------------------

console.log('\nedit a block')
const MARKER = `edited-in-the-browser-${Date.now().toString(36)}`

// Click the hero heading on the canvas — this is how a person selects a block.
await page.locator('h1').first().click()
await page.waitForTimeout(1200)

/**
 * Addressed by `name`, not by label.
 *
 * Puck renders its field labels without a `for` attribute, so `getByLabel` finds
 * nothing at all — and its substring matching made the first attempt worse
 * still, since `getByLabel('Headline')` also matched the eyebrow field labelled
 * "Badge above the headline". That version typed into the badge and then
 * asserted the h1 had changed, reporting a failure that was its own fault.
 */
const headingField = page.locator('textarea[name="heading"]').first()
const hasHeadingField = (await headingField.count()) > 0
check(hasHeadingField, 'clicking a block opens its fields')

if (hasHeadingField) {
  await headingField.fill(MARKER)
  await page.waitForTimeout(1200)
  check(
    (await page.locator(`h1:has-text("${MARKER}")`).count()) > 0,
    'editing a field updates the canvas live',
  )
}

// --- save, then publish -------------------------------------------------

console.log('\nsave and publish')
await page.click('button:has-text("Save draft")')
await page.waitForTimeout(2500)
check((await page.locator('text=Saved.').count()) > 0, 'Save draft reports success')

// A draft must not be public yet.
const slugRes = await ctx.request.get(`${BASE}/api/pages/${pageId}`, {
  headers: { Origin: BASE },
})
const slug = (await slugRes.json()).slug
// Signed in, so this is the team's own preview of an unpublished page. The
// anonymous 404 is covered in builder.e2e.mjs.
const draftPublic = await ctx.request.get(`${BASE}/p/${slug}`, { headers: { Origin: BASE } })
check(draftPublic.status() === 200, 'the team can preview the draft', `${draftPublic.status()}`)

await page.click('button:has-text("Publish")')
await page.waitForTimeout(3000)
check((await page.locator('text=Published.').count()) > 0, 'Publish reports success')

// --- what a visitor gets ------------------------------------------------

console.log('\nthe public page')
const visitor = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const visitorPage = await visitor.newPage()
const res = await visitorPage.goto(`${BASE}/p/${slug}`, { waitUntil: 'domcontentloaded' })
await visitorPage.waitForTimeout(800)

check(res?.status() === 200, 'the published page is public', `${res?.status()}`)
const html = await visitorPage.content()
check(html.includes(MARKER), 'the edit made in the browser is on the public page')

/**
 * The defaults a block ships with became real saved content.
 *
 * This is the check the HTTP suite could not make, and it caught a genuine bug:
 * Puck merges `defaultProps` when it renders in the editor but not into the
 * state it saves, so starter blocks written as `{ type, props: { id } }` looked
 * perfect on the canvas and published a page with no words on it.
 */
for (const preset of ['Hosted by', 'B.O.M.Socks', 'Save my seat', 'eCommHarvest']) {
  check(html.includes(preset), `preset content survived the save: "${preset}"`)
}

// The design system is what styles it — a block that renders with the wrong
// class looks fine in the HTML and unstyled on screen.
const buttonBg = await visitorPage.evaluate(() => {
  const b = document.querySelector('.btn')
  return b ? getComputedStyle(b).backgroundColor : null
})
check(buttonBg === 'rgb(201, 145, 50)', 'buttons are brand gold', `${buttonBg}`)

const overflow = await visitorPage.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth + 1,
)
check(!overflow, 'no horizontal overflow at 1280px')

await visitorPage.setViewportSize({ width: 414, height: 900 })
await visitorPage.waitForTimeout(600)
const overflowMobile = await visitorPage.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth + 1,
)
check(!overflowMobile, 'no horizontal overflow at 414px')

check(errors.length === 0, 'no JavaScript errors in the builder', errors.join(' | ') || 'none')

await browser.close()
console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
