/**
 * The advertising pixel loads only when it is allowed to.
 *
 *   npm run dev   (in another terminal, migrated and seeded)
 *   npm run test:tracking
 *
 * The privacy policy makes four specific promises about this, so each one is
 * checked against what the page actually sends:
 *
 *   1. No pixel ID configured → no tracking script reaches the page at all.
 *   2. A Global Privacy Control or Do Not Track signal → nothing loads, and the
 *      visitor is not asked either. Everywhere in the world.
 *   3. UK, EEA, Switzerland → asked first; nothing loads until they accept.
 *   4. Elsewhere → loads, no bar.
 *
 * Region comes from `x-vercel-ip-country`, which Vercel sets at the edge. Here
 * the test sets it, which is the only way to exercise the branches — and a
 * reminder that in production it is the platform's header, not the client's.
 */

import { chromium } from 'playwright'

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
const ADMIN = process.env.SEED_ADMIN_EMAIL || 'david@lovemarketing.digital'
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'change-me-locally-8f2a'

/** Obviously fake, right shape: 15 digits. */
const PIXEL = '123456789012345'

let passed = 0
let failed = 0
const check = (ok, label, detail = '') => {
  console.log(`${ok ? ' ok ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`)
  ok ? passed++ : failed++
}

const api = async (path, init = {}) =>
  fetch(`${BASE}${path}`, { ...init, headers: { Origin: BASE, ...(init.headers || {}) } })

const login = await (
  await api('/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN, password: PASSWORD }),
  })
).json()
if (!login.token) {
  console.error('FAIL could not sign in')
  process.exit(1)
}
const auth = { Authorization: `JWT ${login.token}`, 'Content-Type': 'application/json' }

const setPixel = async (metaPixelId) => {
  const res = await api('/api/globals/site-styles', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ metaPixelId }),
  })
  if (!res.ok) throw new Error(`saving the pixel ID failed: ${res.status}`)
}

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
)

/**
 * Loads the home page with the given request headers and reports what happened:
 * whether Facebook was contacted, whether the script is in the page, and whether
 * the visitor was asked.
 */
const visit = async (headers) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, extraHTTPHeaders: headers })
  const page = await ctx.newPage()
  const facebookRequests = []
  page.on('request', (req) => {
    if (/facebook\.net|facebook\.com/.test(req.url())) facebookRequests.push(req.url())
  })
  await page.goto(`${BASE}/`, { waitUntil: 'load' })
  await page.waitForTimeout(2500)
  const result = {
    facebookRequests,
    scriptInPage: (await page.content()).includes('fbevents.js'),
    asked: (await page.locator('.consentbar').count()) > 0,
    page,
    ctx,
  }
  return result
}

// --- 1. no pixel configured ---------------------------------------------

console.log('no pixel ID set')
await setPixel('')
{
  const r = await visit({})
  check(!r.scriptInPage, 'no tracking script in the page')
  check(r.facebookRequests.length === 0, 'nothing is requested from Facebook', String(r.facebookRequests.length))
  check(!r.asked, 'and nobody is asked about cookies')
  await r.ctx.close()
}

// --- 2. a pixel, and a browser that says no ------------------------------

await setPixel(PIXEL)

console.log('\na pixel is configured, and the browser sends Global Privacy Control')
{
  const r = await visit({ 'sec-gpc': '1', 'x-vercel-ip-country': 'US' })
  check(!r.scriptInPage, 'the script is not in the page')
  check(r.facebookRequests.length === 0, 'nothing is requested from Facebook')
  check(!r.asked, 'and the visitor is not asked either — the answer was already given')
  await r.ctx.close()
}

console.log('\nthe older Do Not Track header is honoured too')
{
  const r = await visit({ dnt: '1', 'x-vercel-ip-country': 'US' })
  check(!r.scriptInPage && r.facebookRequests.length === 0, 'nothing loads')
  await r.ctx.close()
}

// --- 3. the UK and the EEA: ask first ------------------------------------

for (const country of ['GB', 'DE', 'CH']) {
  console.log(`\na visitor in ${country}`)
  const r = await visit({ 'x-vercel-ip-country': country })
  check(r.asked, 'is asked first')
  check(!r.scriptInPage, 'and nothing loads before they answer')
  check(r.facebookRequests.length === 0, 'nothing is requested from Facebook yet')

  if (country === 'GB') {
    // Accepting loads it, and the answer sticks for the next page.
    await r.page.locator('.consentbar .btn').first().click()
    await r.page.waitForTimeout(2500)
    check(
      (await r.page.content()).includes('fbevents.js'),
      'accepting loads the pixel',
    )
    await r.page.goto(`${BASE}/masterclass`, { waitUntil: 'load' })
    await r.page.waitForTimeout(1500)
    check(
      (await r.page.locator('.consentbar').count()) === 0,
      'and the answer is remembered on the next page',
    )
  }
  await r.ctx.close()
}

console.log('\ndeclining')
{
  const r = await visit({ 'x-vercel-ip-country': 'FR' })
  await r.page.locator('.consentbar .btn-ghost').first().click()
  await r.page.waitForTimeout(1500)
  check(!(await r.page.content()).includes('fbevents.js'), 'declining loads nothing')
  await r.page.goto(`${BASE}/`, { waitUntil: 'load' })
  await r.page.waitForTimeout(1200)
  check((await r.page.locator('.consentbar').count()) === 0, 'and it does not ask again')
  await r.ctx.close()
}

// --- 4. elsewhere it just works -----------------------------------------

console.log('\na visitor in the US')
{
  const r = await visit({ 'x-vercel-ip-country': 'US' })
  check(r.scriptInPage, 'the pixel loads')
  check(!r.asked, 'without a consent bar')
  await r.ctx.close()
}

// Leave it off: this site is not advertising yet.
await setPixel('')

await browser.close()
console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
