/**
 * The header button, and dropdowns in the menu.
 *
 *   npm run dev   (in another terminal, migrated and seeded)
 *   npm run test:header
 *
 * The claims:
 *
 *   - A button set once in Site Styles shows on every page that uses the site
 *     menu, including routes written in code (the blog).
 *   - Each page's Header block can keep it, swap in its own, or hide it — and a
 *     landing page saved before the setting existed, with its menu hidden,
 *     stays without one. Setting a site-wide button must not add a second way
 *     out to a page built around one.
 *   - A menu item with dropdown links opens a list on hover and on its button,
 *     and Escape closes it.
 *   - On a phone the button stays in the bar, beside the logo, without pushing
 *     the page sideways; the dropdown's links are laid out in the menu panel.
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

const saveStyles = async (body) => {
  const res = await api('/api/globals/site-styles', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`saving Site Styles failed: ${res.status} ${await res.text()}`)
}

// --- the site's menu and button ------------------------------------------

await saveStyles({
  navLinks: [
    { label: 'Masterclass', href: '/masterclass' },
    {
      label: 'Resources',
      href: '',
      children: [
        { label: 'Blog', href: '/blog' },
        { label: 'Privacy', href: '/privacy' },
      ],
    },
  ],
  headerCtaLabel: 'Book a call',
  headerCtaHref: '/join',
})
check(true, 'a menu with a dropdown, and a header button, saved in Site Styles')

const refused = await api('/api/globals/site-styles', {
  method: 'POST',
  headers: auth,
  body: JSON.stringify({ navLinks: [{ label: 'Nowhere', href: '' }] }),
})
check(!refused.ok, 'a menu item with neither a link nor a dropdown is refused', String(refused.status))

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
)
const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } })

const ctaOn = async (path) => {
  const page = await desktop.newPage()
  await page.goto(`${BASE}${path}`, { waitUntil: 'load' })
  const text = await page.evaluate(() => document.querySelector('.headcta')?.textContent?.trim() ?? null)
  await page.close()
  return text
}

// --- desktop -------------------------------------------------------------

console.log('\ndesktop')
for (const path of ['/', '/blog']) {
  const text = await ctaOn(path)
  check(text === 'Book a call', `${path} shows the site's button`, String(text))
}

const page = await desktop.newPage()
await page.goto(`${BASE}/`, { waitUntil: 'load' })
await page.waitForTimeout(600)
const dropVisible = () =>
  page.evaluate(() => {
    const drop = document.querySelector('.topnav .navdrop')
    return drop ? getComputedStyle(drop).visibility === 'visible' : null
  })
check((await dropVisible()) === false, 'the dropdown starts closed')
await page.locator('.topnav .navitem').hover()
await page.waitForTimeout(350)
check((await dropVisible()) === true, 'hovering the item opens it')
await page.mouse.move(5, 600)
await page.waitForTimeout(350)
check((await dropVisible()) === false, 'moving away closes it')

await page.locator('.topnav .navcaret').focus()
await page.keyboard.press('Enter')
await page.waitForTimeout(350)
check(
  (await dropVisible()) === true &&
    (await page.locator('.topnav .navcaret').getAttribute('aria-expanded')) === 'true',
  'its button opens it from the keyboard, and says so',
)
await page.keyboard.press('Escape')
await page.waitForTimeout(350)
check((await dropVisible()) === false, 'Escape closes it')
const subLinks = await page.evaluate(() =>
  [...document.querySelectorAll('.topnav .navdrop-link')].map((a) => a.getAttribute('href')),
)
check(subLinks.join() === '/blog,/privacy', 'the dropdown links go where they say', subLinks.join(', '))
await page.close()

// --- per page -------------------------------------------------------------

console.log('\nper page')
const found = await (
  await api('/api/pages?limit=1&where[slug][equals]=masterclass', { headers: auth })
).json()
const target = found.docs?.[0]
const header = target?.content?.content?.find((block) => block.type === 'Header')
if (!header) {
  check(false, 'the masterclass page has a Header block to test with')
} else {
  const original = { ...header.props }
  const setHeader = async (props) => {
    header.props = { ...original, ...props }
    for (const key of Object.keys(props)) if (props[key] === undefined) delete header.props[key]
    const res = await api(`/api/pages/${target.id}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ content: target.content }),
    })
    if (!res.ok) throw new Error(`saving the page failed: ${res.status}`)
  }

  await setHeader({ showMenu: false, button: undefined })
  check((await ctaOn('/masterclass')) === null, 'an older landing page with its menu hidden stays without a button')

  await setHeader({ showMenu: false, button: 'site' })
  check((await ctaOn('/masterclass')) === 'Book a call', 'a page can keep the site button with its menu hidden')

  await setHeader({ button: 'page', buttonLabel: 'Save my seat', buttonHref: '/masterclass/register' })
  check((await ctaOn('/masterclass')) === 'Save my seat', 'a page can show its own button instead')

  await setHeader({ button: 'page', buttonLabel: 'Save my seat', buttonHref: '' })
  check((await ctaOn('/masterclass')) === null, 'a half-filled page button shows nothing, not a dead button')

  await setHeader({ showMenu: true, button: 'none' })
  check((await ctaOn('/masterclass')) === null, 'a page can hide the button and keep the menu')

  // Put it back, so a re-run starts where it started.
  header.props = original
  await api(`/api/pages/${target.id}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ content: target.content }),
  })
}
await desktop.close()

// --- phone ---------------------------------------------------------------

console.log('\nphone')
const phone = await browser.newContext({ viewport: { width: 390, height: 844 } })
const mobile = await phone.newPage()
await mobile.goto(`${BASE}/`, { waitUntil: 'load' })
await mobile.waitForTimeout(700)
const bar = await mobile.evaluate(() => {
  const box = (sel) => document.querySelector(sel)?.getBoundingClientRect()
  const cta = box('.headcta')
  const toggle = box('.navtoggle')
  const brand = box('.brand')
  return {
    ctaVisible: !!cta && cta.width > 0 && cta.right <= window.innerWidth,
    order: toggle && brand && cta ? toggle.right <= brand.left + 1 && brand.right <= cta.left + 1 : false,
    sameRow: !!cta && !!brand && Math.abs(cta.top + cta.height / 2 - (brand.top + brand.height / 2)) < 6,
    noOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
  }
})
check(bar.ctaVisible, 'the button stays in the bar on a phone')
check(bar.order && bar.sameRow, 'menu button, logo, then the header button, on one row')
check(bar.noOverflow, 'nothing pushes the page sideways')

await mobile.locator('.navtoggle').click()
await mobile.waitForTimeout(400)
const panel = await mobile.evaluate(() => ({
  group: document.querySelector('.navpanel .navgroup')?.textContent?.trim(),
  subs: document.querySelectorAll('.navpanel .navlink-sub').length,
}))
check(panel.group === 'Resources' && panel.subs === 2, 'the dropdown is laid out in the phone menu', JSON.stringify(panel))
await phone.close()

// Leave the site as it ships: no menu, no button.
await saveStyles({ navLinks: [], headerCtaLabel: '', headerCtaHref: '' })

await browser.close()
console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
