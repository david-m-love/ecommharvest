/**
 * The logo: uploaded once, sized once, on every page.
 *
 *   npm run dev   (in another terminal, migrated and seeded)
 *   npm run test:logo
 *
 * Three claims, none of them visible from the server side:
 *
 *   - A logo set in Site Styles appears on pages whose Header block has no logo
 *     of its own. That field existed for a day doing nothing at all: it was read
 *     from the database and then dropped on the floor, because a Puck block
 *     cannot query anything and nobody was passing it in.
 *   - Changing "Logo size" changes the rendered height on every page, with no
 *     per-page edit and no deploy.
 *   - Phones cap the height, so choosing "Extra large" at a desk cannot turn the
 *     sticky header into the whole screen on a phone.
 *
 * Setup goes through the REST API rather than the admin UI on purpose. An
 * earlier version drove Payload's upload form with a browser and spent its time
 * on hidden file inputs and drawer timing — testing the admin's widgets, not
 * this feature. The browser is used for the one thing only a browser can answer:
 * how tall the logo actually renders.
 */

import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import sharp from 'sharp'

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
const ADMIN = process.env.SEED_ADMIN_EMAIL || 'david@lovemarketing.digital'
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'change-me-locally-8f2a'

let passed = 0
let failed = 0
const check = (ok, label, detail = '') => {
  console.log(`${ok ? ' ok ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`)
  ok ? passed++ : failed++
}

const api = async (path, init = {}) =>
  fetch(`${BASE}${path}`, {
    ...init,
    headers: { Origin: BASE, ...(init.headers || {}) },
  })

// --- sign in -------------------------------------------------------------

const login = await (
  await api('/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN, password: PASSWORD }),
  })
).json()
const token = login.token
check(Boolean(token), 'signed in through the API')
if (!token) process.exit(1)
const auth = { Authorization: `JWT ${token}` }

// --- a logo in the library ----------------------------------------------

/**
 * A wide lockup, at the real logo's proportions.
 *
 * It used to be an 8×8 square, which is the one shape that cannot catch any of
 * the bugs here. Almost every brand's logo is a symbol beside a wordmark —
 * roughly six times wider than tall — and width, not height, is what runs out
 * first on a phone. Every mobile failure this suite now covers was invisible to
 * a square.
 */
const LOGO_W = 696
const LOGO_H = 120
const LOGO_RATIO = LOGO_W / LOGO_H
const PNG = await sharp({
  create: { width: LOGO_W, height: LOGO_H, channels: 4, background: { r: 22, g: 50, b: 79, alpha: 1 } },
})
  .png()
  .toBuffer()
const file = '/tmp/test-site-logo.png'
writeFileSync(file, PNG)

const form = new FormData()
form.set('file', new Blob([PNG], { type: 'image/png' }), 'test-site-logo.png')
form.set('_payload', JSON.stringify({ alt: 'Site logo' }))
const uploaded = await (await api('/api/media', { method: 'POST', headers: auth, body: form })).json()
const logo = uploaded.doc
check(Boolean(logo?.id && logo?.filename), 'a logo uploaded to the Media library', logo?.filename)

// --- set it globally, once ----------------------------------------------

const setSize = async (logoSize) => {
  const res = await api('/api/globals/site-styles', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ logo: logo.id, logoText: 'eCommHarvest', logoSize }),
  })
  if (!res.ok) throw new Error(`saving Site Styles failed: ${res.status}`)
}

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
)

/** The rendered height of the header logo, in CSS pixels, as a person sees it. */
const logoOn = async (ctx, path) => {
  const p = await ctx.newPage()
  await p.goto(`${BASE}${path}`, { waitUntil: 'load' })
  await p.waitForTimeout(500)
  const found = await p.evaluate(() => {
    const img = document.querySelector('.brand img')
    if (!img) return null
    const box = img.getBoundingClientRect()
    return {
      height: Math.round(box.height),
      width: Math.round(box.width),
      src: img.getAttribute('src'),
    }
  })
  await p.close()
  return found
}

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } })

await setSize('medium')
const medium = await logoOn(desktop, '/')
check(
  Boolean(medium?.src?.includes(logo.filename)),
  'the Site Styles logo shows in the header with no per-page edit',
  medium?.src || 'no logo rendered',
)
check(medium?.height === 41, "medium renders at 41px", `${medium?.height}px`)

await setSize('xlarge')
const [xlHome, xlMasterclass] = [await logoOn(desktop, '/'), await logoOn(desktop, '/masterclass')]
check(xlHome?.height === 72, 'extra large renders at 72px on /', `${xlHome?.height}px`)
check(
  xlMasterclass?.height === 72,
  'and on /masterclass, with no edit to that page',
  `${xlMasterclass?.height}px`,
)

await setSize('small')
const small = await logoOn(desktop, '/')
check(small?.height === 31, 'small renders at 31px', `${small?.height}px`)

// --- on a phone ----------------------------------------------------------

/**
 * The four sizes have to mean four things on a phone too.
 *
 * They used to be capped at a flat 41px, which made Medium, Large and Extra
 * large render identically on every phone: the setting silently did nothing
 * above Medium, and the answer to "make the logo bigger" was that there was no
 * way to. Each size is smaller than on a desktop — an extra-large logo must not
 * eat a phone screen — but they are distinct, and they scale in order.
 */
const phone = await browser.newContext({ viewport: { width: 390, height: 844 } })

/**
 * Measured on a page with **no menu**, because that is where the sizes have room
 * to differ.
 *
 * With a menu button on a 390px screen, a lockup six times wider than it is tall
 * runs out of width at about 44px — so Large and Extra large are the same size
 * there, and correctly so. Asserting the ordering on such a page would be
 * asserting that physics is wrong; the pages with a menu are checked below for
 * what actually matters there, which is that nothing collides.
 */
const heights = {}
for (const size of ['small', 'medium', 'large', 'xlarge']) {
  await setSize(size)
  heights[size] = await logoOn(phone, '/masterclass/register')
}

check(
  heights.small.height < heights.medium.height,
  'small is smaller than medium on a phone',
  `${heights.small.height}px vs ${heights.medium.height}px`,
)
check(
  heights.medium.height < heights.large.height,
  'and medium smaller than large — the setting is not ignored',
  `${heights.medium.height}px vs ${heights.large.height}px`,
)
check(
  heights.xlarge.height <= 72 && heights.xlarge.height > heights.medium.height,
  'extra large is bigger still, without eating the screen',
  `${heights.xlarge.height}px`,
)

/**
 * Proportions, at every size.
 *
 * The obvious way to stop a wide logo overflowing — a set height with a
 * max-width — clamps the width while the height stands still, and the logo comes
 * out squashed. It measured 4.9:1 for a 5.8:1 file, which is the kind of wrong
 * nobody can name but everybody can see.
 */
for (const [size, box] of Object.entries(heights)) {
  const ratio = box.width / box.height
  check(
    Math.abs(ratio - LOGO_RATIO) / LOGO_RATIO < 0.06,
    `${size} keeps the logo's proportions`,
    `${ratio.toFixed(2)} vs ${LOGO_RATIO.toFixed(2)}`,
  )
}

/** And none of them may run into the menu button or off the screen. */
for (const [size] of Object.entries(heights)) {
  await setSize(size)
  const page = await phone.newPage()
  await page.goto(`${BASE}/`, { waitUntil: 'load' })
  await page
    .waitForFunction(
      () => {
        const img = document.querySelector('.brand img')
        return img && img.complete && img.naturalWidth > 0
      },
      { timeout: 30_000 },
    )
    .catch(() => {})
  const clash = await page.evaluate(() => {
    const img = document.querySelector('.brand img')
    const toggle = document.querySelector('.navtoggle')
    const i = img.getBoundingClientRect()
    const visible = toggle && getComputedStyle(toggle).display !== 'none'
    const t = visible ? toggle.getBoundingClientRect() : null
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      overlaps: t ? i.left < t.right : false,
      offscreen: i.left < 0 || i.right > window.innerWidth,
    }
  })
  check(!clash.overflow, `${size} does not push the page sideways`)
  check(!clash.overlaps, `${size} does not run into the menu button`)
  check(!clash.offscreen, `${size} stays on the screen`)
  await page.close()
}
await phone.close()

// Leave it where a person would want it.
await setSize('medium')
const restored = await logoOn(desktop, '/')
check(restored?.height === 41, 'and the size can be set back', `${restored?.height}px`)

await desktop.close()
await browser.close()
console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
