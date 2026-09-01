/**
 * The funnel, now that it lives on this site.
 *
 *   npm run dev   (in another terminal, migrated and seeded)
 *   npm run test:funnel
 *
 * Registration used to be a GoHighLevel page on another domain. It is a
 * page-builder page here now, with GHL's form embedded in a block — so the
 * things that can break are new ones:
 *
 *   - The embed's id must be exactly `inline-<form id>`. It is not decoration:
 *     GHL's script finds the iframe by that id to set its height, and a
 *     mismatch leaves a collapsed frame with no error anywhere.
 *   - Every "Save my seat" has to point here rather than at the old funnel.
 *     Missing one sends people to a page that is no longer the funnel.
 *   - Neither page may 404. These are the two pages somebody hits immediately
 *     before and after handing over their email.
 *
 * The form's own contents are not tested: it is a cross-origin iframe belonging
 * to somebody else, and a test that opened it would be testing GoHighLevel.
 */

import { chromium } from 'playwright'

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
const FORM_ID = '4KbBmtflATgx2fMZiNYU'

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
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()

/**
 * The form is on someone else's server, and this sandbox has no route to it.
 * Requests to it are answered with an empty page so the embed still mounts and
 * can be measured — the point here is our markup, not their form.
 */
await ctx.route('**/api.shoqwave.com/**', (route) =>
  route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><p>form</p>' }),
)

// --- the registration page ----------------------------------------------

console.log('the registration page')
let res = await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' })
check(res?.status() === 200, '/register answers', `${res?.status()}`)
await page.waitForTimeout(1200)

const embed = await page.evaluate(() => {
  const frame = document.querySelector('iframe.formembed')
  if (!frame) return null
  const box = frame.getBoundingClientRect()
  return {
    src: frame.getAttribute('src'),
    id: frame.getAttribute('id'),
    title: frame.getAttribute('title'),
    formId: frame.getAttribute('data-form-id'),
    layoutId: frame.getAttribute('data-layout-iframe-id'),
    consent: frame.getAttribute('data-cookie-consent'),
    width: Math.round(box.width),
    height: Math.round(box.height),
  }
})
check(Boolean(embed), 'the form is embedded on it')
check(
  embed?.src === `https://api.shoqwave.com/widget/form/${FORM_ID}`,
  'pointing at the right form',
  embed?.src,
)
check(
  embed?.id === `inline-${FORM_ID}` && embed?.layoutId === `inline-${FORM_ID}`,
  'with the id GoHighLevel’s script looks for',
  `${embed?.id}`,
)
check(embed?.formId === FORM_ID, 'and the form id it reads the height against')
check(embed?.consent === 'true', 'cookie consent is left switched on', `${embed?.consent}`)

/**
 * The title is what a screen reader announces. GHL's own embed code passes the
 * form's internal name through — "Masterclass Registration 9/3/2026" — which is
 * an out-of-date internal label read aloud to the one visitor who cannot see the
 * page.
 */
check(
  Boolean(embed?.title) && !/\d{1,2}\/\d{1,2}\/\d{4}/.test(embed.title),
  'the frame is named for a person, not with an internal form name',
  `${embed?.title}`,
)

/** Before the script answers, the space has to be held or the page looks broken. */
check(
  (embed?.height ?? 0) >= 480,
  'the space is reserved before the form reports its height',
  `${embed?.height}px`,
)

const scriptSrc = await page.evaluate(() =>
  Array.from(document.querySelectorAll('script'))
    .map((s) => s.getAttribute('src'))
    .filter((src) => src && src.includes('form_embed')),
)
check(scriptSrc.length === 1, 'the resizing script is loaded exactly once', `${scriptSrc.length}`)

check(
  (await page.locator('header.topbar .brand').count()) > 0,
  'the page carries our own header',
)
check((await page.locator('footer .foot-nav').count()) > 0, 'and our own footer')

// --- the thank-you page -------------------------------------------------

console.log('\nthe thank-you page')
res = await page.goto(`${BASE}/masterclass/thanks`, { waitUntil: 'domcontentloaded' })
check(res?.status() === 200, '/masterclass/thanks answers', `${res?.status()}`)
const thanksText = await page.locator('body').innerText()
check(/seat is saved|registered/i.test(thanksText), 'it confirms the registration')
check(
  /inbox|spam|promotions/i.test(thanksText),
  'and asks them to find the email, which is what decides whether they turn up',
)
const robots = await page.evaluate(
  () => document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
)
check(/noindex/.test(robots), 'the confirmation is kept out of search', robots)

// --- nothing still points at the old funnel -----------------------------

console.log('\nwhere “Save my seat” goes')
for (const path of ['/', '/masterclass']) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a')).map((a) => a.getAttribute('href') || ''),
  )
  const offsite = hrefs.filter((href) => href.includes('go.ecommharvest.com'))
  /**
   * A way *into* the funnel, not specifically the form.
   *
   * The home page pointing at `/masterclass` is right — that is the page that
   * does the persuading, and sending someone straight to a form they have not
   * been sold on is worse. What must never happen is a link to the old
   * GoHighLevel copy, which is a second version of a page that also exists here
   * and is no longer the one being edited.
   */
  const inbound = hrefs.filter((href) => href === '/register' || href === '/masterclass')
  check(offsite.length === 0, `${path} sends nobody to the old funnel`, offsite.join(', ') || 'none')
  check(inbound.length > 0, `${path} leads into our own funnel`, `${inbound.length} link(s)`)
}

/** The structured data tells Google where to register; it must agree. */
await page.goto(`${BASE}/masterclass`, { waitUntil: 'domcontentloaded' })
const ld = await page.evaluate(() => {
  const tag = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    .map((s) => s.textContent || '')
    .find((text) => text.includes('"Event"'))
  return tag ? JSON.parse(tag) : null
})
check(
  typeof ld?.location?.url === 'string' && ld.location.url.includes('/register'),
  'the Event data points at our registration page',
  `${ld?.location?.url}`,
)

// --- on a phone ----------------------------------------------------------

console.log('\non a phone')
await page.setViewportSize({ width: 414, height: 900 })
await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1000)
const mobile = await page.evaluate(() => {
  const frame = document.querySelector('iframe.formembed')
  return {
    width: frame ? Math.round(frame.getBoundingClientRect().width) : null,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  }
})
check(!mobile.overflow, 'the page does not push sideways')
check(
  mobile.width !== null && mobile.width <= 414 && mobile.width > 300,
  'the form fills the screen without overflowing it',
  `${mobile.width}px`,
)

await browser.close()
console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
