/**
 * Managing pages, and the editor's honesty about small screens.
 *
 *   npm run dev   (in another terminal, migrated and seeded)
 *   npm run test:manage
 *
 * What this covers, all of which was missing:
 *
 *   - Duplicate: build a second landing page from one that works.
 *   - Delete: remove a page created by mistake, without going into the admin.
 *   - The site's own pages cannot be deleted, because /, /masterclass, /privacy
 *     and /terms are rendered by routes and deleting one breaks a URL.
 *   - A draft offers a Preview rather than a View, since it has no public page.
 *   - Below Puck's breakpoint the editor says so instead of showing a canvas
 *     with no panels.
 *   - Work in progress survives a closed tab.
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

await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' })
await page.fill('#field-email', ADMIN)
await page.fill('#field-password', PASSWORD)
await page.click('button[type=submit]')
await page.waitForURL(/\/admin(?!\/login)/, { timeout: 90_000 })

// --- a page to play with -------------------------------------------------

console.log('create, duplicate, delete')
await page.goto(`${BASE}/builder`, { waitUntil: 'domcontentloaded' })
await page.click('button:has-text("New page")')
await page.waitForURL(/\/builder\/\d+$/, { timeout: 60_000 })
const createdId = Number(page.url().split('/').pop())
check(Number.isFinite(createdId), 'a page was created', `id ${createdId}`)

// --- the editor on a phone ----------------------------------------------

console.log('\nthe editor on a small screen')
{
  const small = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ctx.storageState() })
  const p = await small.newPage()
  await p.goto(`${BASE}/builder/${createdId}`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(4000)
  const notice = await p.evaluate(() => {
    const el = document.querySelector('.editor-toosmall')
    if (!el) return null
    const style = getComputedStyle(el)
    return { visible: style.display !== 'none', text: el.textContent.slice(0, 60) }
  })
  check(notice?.visible === true, 'it says the builder needs a bigger screen', notice?.text?.trim())
  check(
    (await p.locator('.editor-toosmall a[href="/builder"]').count()) > 0,
    'and offers a way back to the page list',
  )
  await p.close()
  await small.close()
}
// And not on a laptop.
{
  const wide = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: await ctx.storageState() })
  const p = await wide.newPage()
  await p.goto(`${BASE}/builder/${createdId}`, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('text=Components', { timeout: 90_000 })
  const hidden = await p.evaluate(
    () => getComputedStyle(document.querySelector('.editor-toosmall')).display === 'none',
  )
  check(hidden, 'and the notice is hidden on a laptop')
  await p.close()
  await wide.close()
}

// --- work survives a closed tab -----------------------------------------

console.log('\nunsaved work survives a closed tab')
{
  const p = await ctx.newPage()
  await p.goto(`${BASE}/builder/${createdId}`, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('text=Components', { timeout: 90_000 })
  await p.waitForTimeout(3000)
  await p.locator('h1').first().click()
  await p.waitForTimeout(1200)
  const MARKER = `recovered-${Date.now().toString(36)}`
  const field = p.locator('textarea[name="heading"]').first()
  if (await field.count()) {
    await field.fill(MARKER)
    await p.waitForTimeout(1500)
  }
  // Close without saving — the equivalent of a closed laptop.
  await p.close()

  const again = await ctx.newPage()
  await again.goto(`${BASE}/builder/${createdId}`, { waitUntil: 'domcontentloaded' })
  await again.waitForSelector('text=Components', { timeout: 90_000 })
  await again.waitForTimeout(3000)
  const offered = await again.locator('text=There is newer work in this browser').count()
  check(offered > 0, 'the editor offers to restore it')

  if (offered > 0) {
    await again.locator('button:has-text("Restore it")').click()
    await again.waitForTimeout(2500)
    check(
      (await again.locator(`h1:has-text("${MARKER}")`).count()) > 0,
      'restoring puts the work back on the canvas',
    )
  }
  await again.close()
}

// --- duplicate -----------------------------------------------------------

console.log('\nduplicate')
await page.goto(`${BASE}/builder`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('h1', { timeout: 30_000 })
const firstCard = page.locator('.card').first()
await firstCard.locator('button:has-text("Duplicate")').click()
await page.waitForURL(/\/builder\/\d+$/, { timeout: 60_000 })
const copyId = Number(page.url().split('/').pop())
check(Number.isFinite(copyId) && copyId !== createdId, 'duplicating opens the copy', `id ${copyId}`)

const copy = await (
  await ctx.request.get(`${BASE}/api/pages/${copyId}`, { headers: { Origin: BASE } })
).json()
check(copy.status === 'draft', 'a copy is always a draft, whatever the original was', copy.status)
check(/copy/.test(copy.slug), 'and gets its own URL', copy.slug)

// --- the site's own pages are protected ---------------------------------

console.log('\nthe site’s own pages')
await page.goto(`${BASE}/builder`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('h1', { timeout: 30_000 })
const homeCard = page.locator('.card', { hasText: '/masterclass ·' }).first()
check(
  (await homeCard.locator('text=Part of the site').count()) > 0,
  'the masterclass page shows no delete button',
)
check(
  (await homeCard.locator('button:has-text("Duplicate")').count()) > 0,
  'but can still be duplicated',
)

// Even asked directly, the server refuses.
const forced = await ctx.request.post(`${BASE}/api/builder/2/actions`, {
  form: { action: 'delete' },
  headers: { Origin: BASE },
  maxRedirects: 0,
})
const location = forced.headers()['location'] || ''
check(
  /error=/.test(location) || forced.status() === 400,
  'and the server refuses even when asked directly',
  `${forced.status()} ${location.slice(0, 60)}`,
)

// --- delete --------------------------------------------------------------

console.log('\ndelete')
await page.goto(`${BASE}/builder`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('h1', { timeout: 30_000 })
const before = await page.locator('.card').count()
page.on('dialog', (d) => d.accept())
const deletable = page.locator('.card', { hasText: 'Draft' }).first()
await deletable.locator('button:has-text("Delete")').click()
await page.waitForTimeout(3000)
check(
  (await page.locator('.flash-ok').count()) > 0,
  'deleting reports what was removed',
  (await page.locator('.flash-ok').textContent().catch(() => '')) || '',
)
const after = await page.locator('.card').count()
check(after === before - 1, 'and the page is gone from the list', `${before} → ${after}`)

// --- a draft offers a preview -------------------------------------------

console.log('\ndrafts')
const draftCard = page.locator('.card', { hasText: 'Draft' }).first()
if ((await draftCard.count()) > 0) {
  check(
    (await draftCard.locator('a:has-text("Preview")').count()) > 0,
    'a draft offers Preview rather than View',
  )
}

await browser.close()
console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
