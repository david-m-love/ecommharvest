/**
 * The site menu, and the header on a phone.
 *
 *   npm run dev   (in another terminal, migrated and seeded)
 *   npm run test:nav
 *
 * Four claims:
 *
 *   - Menu links set once in Site Styles appear in the header of every page.
 *   - On a phone they collapse behind a button that actually opens and closes.
 *   - The logo is centred on a phone — centred in the *bar*, not in the space
 *     left beside the menu button, which is a different position and looks like
 *     a mistake.
 *   - A page can hide the menu, because a landing page with one job converts
 *     better without five ways to leave.
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

// --- set a menu, once, for the whole site --------------------------------

const LINKS = [
  { label: 'Masterclass', href: '/masterclass', emphasis: false },
  { label: 'Privacy', href: '/privacy', emphasis: false },
  { label: 'Save my seat', href: 'https://go.ecommharvest.com/register', emphasis: true },
]

const setMenu = async (navLinks) => {
  const res = await api('/api/globals/site-styles', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ navLinks }),
  })
  if (!res.ok) throw new Error(`saving the menu failed: ${res.status}`)
}
await setMenu(LINKS)
check(true, 'menu links saved in Site Styles', `${LINKS.length} links`)

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
)

// --- desktop: the menu is in the header of every page --------------------

console.log('\ndesktop')
const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } })
for (const path of ['/', '/privacy']) {
  const page = await desktop.newPage()
  await page.goto(`${BASE}${path}`, { waitUntil: 'load' })
  await page.waitForTimeout(600)
  const shown = await page.evaluate(() =>
    [...document.querySelectorAll('.topnav .navlink')].map((a) => a.textContent.trim()),
  )
  check(shown.length === 3, `${path} shows the menu`, shown.join(', ') || 'none')
  const cta = await page.evaluate(
    () => !!document.querySelector('.topnav .navlink-cta'),
  )
  check(cta, `${path} renders the emphasised link as a button`)
  await page.close()
}
await desktop.close()

// --- phone: centred logo, and a menu that opens --------------------------

console.log('\nphone')
const phone = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await phone.newPage()
await page.goto(`${BASE}/`, { waitUntil: 'load' })
await page.waitForTimeout(700)

const centring = await page.evaluate(() => {
  const brand = document.querySelector('.brand')
  const bar = document.querySelector('.topbar-in')
  if (!brand || !bar) return null
  const b = brand.getBoundingClientRect()
  const barBox = bar.getBoundingClientRect()
  return {
    // How far the logo's centre is from the bar's centre, in pixels.
    offset: Math.abs(b.left + b.width / 2 - (barBox.left + barBox.width / 2)),
    inlineNavVisible: getComputedStyle(document.querySelector('.topnav')).display !== 'none',
    toggleVisible: getComputedStyle(document.querySelector('.navtoggle')).display !== 'none',
  }
})
check(centring && centring.offset <= 2, 'the logo is centred on a phone', `${centring?.offset.toFixed(1)}px off centre`)
check(centring && !centring.inlineNavVisible, 'the inline menu is hidden on a phone')
check(centring && centring.toggleVisible, 'a menu button is shown instead')

const panelOpen = async () =>
  page.evaluate(() => {
    const panel = document.querySelector('.navpanel')
    return panel ? getComputedStyle(panel).display !== 'none' : false
  })

check(!(await panelOpen()), 'the menu starts closed')
await page.locator('.navtoggle').click()
await page.waitForTimeout(500)
check(await panelOpen(), 'tapping the button opens it')
check(
  (await page.locator('.navpanel .navlink').count()) === 3,
  'the open menu lists every link',
  `${await page.locator('.navpanel .navlink').count()}`,
)
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
check(!(await panelOpen()), 'Escape closes it')

await page.locator('.navtoggle').click()
await page.waitForTimeout(400)
const noOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth <= window.innerWidth + 1,
)
check(noOverflow, 'an open menu does not push the page sideways')
await page.close()
await phone.close()

// --- a page can hide the menu -------------------------------------------

console.log('\nhiding the menu on a landing page')
const pagesRes = await (
  await api('/api/pages?limit=1&where[slug][equals]=masterclass', { headers: auth })
).json()
const target = pagesRes.docs?.[0]
if (target) {
  const content = target.content
  const header = content.content.find((block) => block.type === 'Header')
  if (header) {
    header.props.showMenu = false
    const saved = await api(`/api/pages/${target.id}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ content }),
    })
    check(saved.ok, 'the masterclass header is set to hide the menu', String(saved.status))

    const check2 = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const p2 = await check2.newPage()
    await p2.goto(`${BASE}/masterclass`, { waitUntil: 'load' })
    await p2.waitForTimeout(600)
    check(
      (await p2.locator('.topnav .navlink').count()) === 0,
      'and the landing page shows no menu',
    )
    await p2.close()
    await check2.close()

    // Put it back, so a re-run starts where it started.
    header.props.showMenu = true
    await api(`/api/pages/${target.id}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ content }),
    })
  }
}

// Leave the site without a menu: that is the shipped default, and a landing
// page is what this site currently is.
await setMenu([])

await browser.close()
console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
