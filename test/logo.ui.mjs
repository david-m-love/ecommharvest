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

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAKUlEQVR42mNkYPjPwMDAyMDAwMgABYwMUMDIAAWMDFDAyAAFjAxQwMgABQBnAAeQm3rHAAAAAElFTkSuQmCC',
  'base64',
)
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
    return img ? { height: Math.round(img.getBoundingClientRect().height), src: img.getAttribute('src') } : null
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
check(medium?.height === 34, 'medium renders at 34px', `${medium?.height}px`)

await setSize('xlarge')
const [xlHome, xlMasterclass] = [await logoOn(desktop, '/'), await logoOn(desktop, '/masterclass')]
check(xlHome?.height === 60, 'extra large renders at 60px on /', `${xlHome?.height}px`)
check(
  xlMasterclass?.height === 60,
  'and on /masterclass, with no edit to that page',
  `${xlMasterclass?.height}px`,
)

await setSize('small')
const small = await logoOn(desktop, '/')
check(small?.height === 26, 'small renders at 26px', `${small?.height}px`)

// --- phones cap it -------------------------------------------------------

await setSize('xlarge')
const phone = await browser.newContext({ viewport: { width: 390, height: 844 } })
const onPhone = await logoOn(phone, '/')
check(onPhone?.height === 34, 'an extra-large logo is capped on a phone', `${onPhone?.height}px`)
await phone.close()

// Leave it where a person would want it.
await setSize('medium')
const restored = await logoOn(desktop, '/')
check(restored?.height === 34, 'and the size can be set back', `${restored?.height}px`)

await desktop.close()
await browser.close()
console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
