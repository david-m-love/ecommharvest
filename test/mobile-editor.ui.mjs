/**
 * Building a page on a phone.
 *
 *   npm run dev   (in another terminal, migrated and seeded)
 *   npm run test:mobile
 *
 * Until now the builder refused to open below 1024px and showed a notice saying
 * to come back at a computer. This suite is the claim that replaced it: the whole
 * editing loop — select, edit, add, reorder, save, publish — done at 390×844 with
 * taps rather than clicks.
 *
 * Two things here are worth more than the rest:
 *
 *   - **The panel measurements.** Puck lays its component list and field editor
 *     out in grid columns beside the canvas, which is what made a phone
 *     unusable, and the fix is CSS matching Puck's content-hashed class names. A
 *     Puck upgrade could rename those and break it in a way nothing else would
 *     notice, so the panel's width and the canvas's width are both asserted.
 *   - **The desktop check at the end.** All of this is behind a media query, and
 *     the laptop editor is the one that gets used most.
 */

import { chromium } from 'playwright'

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
const ADMIN = process.env.SEED_ADMIN_EMAIL || 'david@lovemarketing.digital'
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'change-me-locally-8f2a'

const PHONE = { width: 390, height: 844 }

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

/** Signed in on a laptop first, so the phone context starts authenticated. */
const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const deskPage = await desk.newPage()
await deskPage.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' })
await deskPage.fill('#field-email', ADMIN)
await deskPage.fill('#field-password', PASSWORD)
await deskPage.click('button[type=submit]')
await deskPage.waitForURL(/\/admin(?!\/login)/, { timeout: 90_000 })
const signedIn = await desk.storageState()

/**
 * A page of its own to work on.
 *
 * The masterclass page would do, and then a failed run would leave the live site
 * carrying whatever this test typed into it.
 */
const stamp = Date.now().toString(36)
const created = await desk.request.post(`${BASE}/api/pages`, {
  headers: { Origin: BASE, 'Content-Type': 'application/json' },
  data: { title: `phone-${stamp}` },
})
const pageId = (await created.json()).doc?.id
check(Boolean(pageId), 'a scratch page to edit', `id ${pageId}`)

const phone = await browser.newContext({
  ...PHONE,
  viewport: PHONE,
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  storageState: signedIn,
})
const page = await phone.newPage()

const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`))
page.on('console', (m) => {
  if (m.type() !== 'error') return
  const text = m.text()
  if (/Failed to load resource|net::|ERR_/i.test(text)) return
  errors.push(`console: ${text.slice(0, 200)}`)
})

await page.goto(`${BASE}/builder/${pageId}`, { waitUntil: 'domcontentloaded' })
/**
 * Next's development error overlay sits in a `<nextjs-portal>` covering the
 * bottom-left corner, which is exactly where the action bar is — every tap on
 * "Add block" hits the overlay instead. It does not exist in a production build,
 * so hiding it tests the real thing rather than working around it.
 */
await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' })
await page.waitForSelector('.editor-actionbar', { timeout: 90_000 })
await page.waitForTimeout(6000)
await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' })

// --- it opens at all ----------------------------------------------------

console.log('the editor on a phone')
check(
  (await page.locator('.editor-toosmall').count()) === 0,
  'no "this needs a bigger screen" notice',
)

const frame = await page.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  }
  return {
    top: box('.editor-topbar'),
    bottom: box('.editor-actionbar'),
    puckHeader: box('[class^="_PuckHeader_"]'),
    canvas: box('[class^="_PuckCanvas_"]'),
    docHeight: document.documentElement.scrollHeight,
    docWidth: document.documentElement.scrollWidth,
    inner: window.innerHeight,
  }
})
check(frame.top?.y === 0 && frame.top.w === PHONE.width, 'a bar across the top', JSON.stringify(frame.top))
check(
  Boolean(frame.bottom) && frame.bottom.y + frame.bottom.h === PHONE.height,
  'and one across the bottom, flush with the screen',
  JSON.stringify(frame.bottom),
)
check(
  !frame.puckHeader || frame.puckHeader.h === 0,
  "Puck's own header is out of the way",
  JSON.stringify(frame.puckHeader),
)
check(frame.canvas?.w === PHONE.width, 'the page gets the full width of the screen', `${frame.canvas?.w}px`)
check(
  frame.docHeight <= frame.inner + 1 && frame.docWidth <= PHONE.width + 1,
  'and nothing spills outside the screen',
  `${frame.docWidth}×${frame.docHeight} in ${PHONE.width}×${frame.inner}`,
)

// --- tapping a block edits it -------------------------------------------

console.log('\ntap a block to edit it')
await page.locator('h1').first().tap()
await page.waitForTimeout(2000)

const panel = await page.evaluate(() => {
  const sidebar = document.querySelector('.Puck [class^="_Sidebar_"]')
  const canvas = document.querySelector('[class^="_PuckCanvas_"]')
  const r = (el) => (el ? Math.round(el.getBoundingClientRect().width) : null)
  return { sidebar: r(sidebar), canvas: r(canvas) }
})
check(panel.sidebar === PHONE.width, 'its fields cover the screen', `${panel.sidebar}px`)
check(
  panel.canvas === PHONE.width,
  'without squeezing the page into a column beside them',
  `canvas ${panel.canvas}px`,
)

const heading = page.locator('textarea[name="heading"]').first()
check((await heading.count()) > 0, 'the fields are the ones for that block')

const MARKER = `phone-edit-${stamp}`
if (await heading.count()) {
  await heading.fill(MARKER)
  await page.waitForTimeout(1200)
  check(
    (await page.locator('.editor-status').textContent())?.includes('Not saved'),
    'the bar says there is something to save',
    (await page.locator('.editor-status').textContent()) || '',
  )
}

/** iOS zooms in — and never back out — when a field under 16px takes focus. */
const fontSizes = await page.evaluate(() =>
  Array.from(document.querySelectorAll('.Puck input, .Puck textarea')).map((el) =>
    parseFloat(getComputedStyle(el).fontSize),
  ),
)
check(
  fontSizes.length > 0 && fontSizes.every((size) => size >= 16),
  'text fields are big enough that iOS will not zoom the page',
  `${Math.min(...fontSizes)}px smallest of ${fontSizes.length}`,
)

// --- move and delete ----------------------------------------------------

console.log('\nmoving a block without dragging it')
check((await page.locator('.editor-blockbar').count()) > 0, 'the selected block can be moved by tapping')
const upDisabledFirst = await page
  .locator('.editor-blockbar button:has-text("Up")')
  .isDisabled()
check(upDisabledFirst, 'the first block cannot move up')

/**
 * Whether the block moved is answered by where its text now sits on the page,
 * not by whether the text still exists. The first version of this check compared
 * the heading with itself and could not fail.
 */
const canvasText = () =>
  page.evaluate(() => document.querySelector('[class^="_PuckCanvas_"]')?.innerText || '')
const before = (await canvasText()).indexOf(MARKER)
await page.locator('.editor-blockbar button:has-text("Down")').tap()
await page.waitForTimeout(1500)
const after = (await canvasText()).indexOf(MARKER)
check(before >= 0 && after > before, 'Down moves the block further down the page', `${before} → ${after}`)
check(
  await page.locator('.editor-blockbar button:has-text("Up")').isEnabled(),
  'and once moved, it can move back',
)
await page.locator('.editor-blockbar button:has-text("Up")').tap()
await page.waitForTimeout(1500)
check(
  (await canvasText()).indexOf(MARKER) === before,
  'Up puts it back where it was',
  `${(await canvasText()).indexOf(MARKER)}`,
)

// --- adding a block -----------------------------------------------------

console.log('\nadding a block')
await page.locator('.editor-btn:has-text("Done")').tap()
await page.waitForTimeout(1000)
check(
  (await page.locator('.Puck [class^="_Sidebar_"]').count()) === 0,
  'Done closes the fields',
)

await page.locator('.editor-btn:has-text("Add block")').tap()
await page.waitForTimeout(900)
const rows = await page.locator('.editor-blockrow').count()
check(rows > 6, 'the block list opens as a full-screen sheet', `${rows} blocks`)

const sheetFits = await page.evaluate(() => {
  const sheet = document.querySelector('.editor-sheet')
  const bar = document.querySelector('.editor-actionbar')
  if (!sheet || !bar) return null
  return Math.round(sheet.getBoundingClientRect().bottom) <= Math.round(bar.getBoundingClientRect().top)
})
check(sheetFits === true, 'and stops above the buttons rather than under them')

await page.locator('.editor-blockrow:has-text("Bullet list")').first().tap()
await page.waitForTimeout(2500)
check(
  (await page.locator('.Puck [class^="_Sidebar_"]').count()) > 0,
  'tapping a block adds it and opens its fields',
)
check(
  (await page.locator('.editor-sheet').count()) === 0,
  'and the list closes behind it',
)

// --- delete asks first --------------------------------------------------

console.log('\ndeleting')
let asked = null
const onDialog = async (dialog) => {
  asked = dialog.message()
  await dialog.dismiss()
}
page.on('dialog', onDialog)
await page.locator('.editor-blockbar button:has-text("Delete")').tap()
await page.waitForTimeout(1200)
check(Boolean(asked), 'delete asks before removing a section', asked || 'no prompt')
check(
  (await page.locator('.Puck [class^="_Sidebar_"]').count()) > 0,
  'and saying no keeps the block',
)
page.off('dialog', onDialog)

// --- save, then publish -------------------------------------------------

console.log('\nsaving and publishing from the phone')
await page.locator('.editor-btn:has-text("Save")').tap()
await page.waitForTimeout(3000)
check(
  (await page.locator('.editor-status').textContent())?.includes('Saved'),
  'Save reports success',
  (await page.locator('.editor-status').textContent()) || '',
)

await page.locator('.editor-btn:has-text("Publish")').tap()
await page.waitForTimeout(3500)
const published = (await page.locator('.editor-status').textContent()) || ''
check(published.includes('Published') || published.includes('Live'), 'Publish reports success', published)

const record = await (
  await desk.request.get(`${BASE}/api/pages/${pageId}`, { headers: { Origin: BASE } })
).json()
check(record.status === 'published', 'the page really is published', record.status)

const visitor = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true })
const visitorPage = await visitor.newPage()
const live = await visitorPage.goto(`${BASE}/p/${record.slug}`, { waitUntil: 'domcontentloaded' })
const html = await visitorPage.content()
check(live?.status() === 200, 'the page a visitor gets is live', `${live?.status()}`)
check(html.includes(MARKER), 'and carries the edit typed on the phone')
check(html.includes('Your promotional calendar'), 'and the block added on the phone')
await visitor.close()

// --- leaving -------------------------------------------------------------

console.log('\nleaving')
/**
 * Something to lose first, or the prompt has no reason to appear and this passes
 * for the wrong reason — which is exactly what the first version of it did, by
 * typing into a field the selected block does not have.
 */
const anyField = page.locator('.Puck [class^="_Sidebar_"] textarea, .Puck [class^="_Sidebar_"] input[type=text]').first()
check((await anyField.count()) > 0, 'a field to type into', `${await anyField.count()} found`)
await anyField.fill(`${MARKER}-again`)
await page.waitForTimeout(1500)
check(
  (await page.locator('.editor-status').textContent())?.includes('Not saved'),
  'which leaves unsaved changes',
  (await page.locator('.editor-status').textContent()) || '',
)
let leavePrompt = null
const onLeave = async (dialog) => {
  leavePrompt = dialog.message()
  await dialog.dismiss()
}
page.on('dialog', onLeave)
await page.locator('.editor-topbar a:has-text("Pages")').tap()
await page.waitForTimeout(2000)
check(Boolean(leavePrompt), 'going back with unsaved changes asks first', leavePrompt || 'no prompt')
check(page.url().includes(`/builder/${pageId}`), 'and saying no keeps you where you were')
page.off('dialog', onLeave)

check(errors.length === 0, 'no JavaScript errors on the phone', errors.join(' | ') || 'none')

// --- the laptop is untouched --------------------------------------------

console.log('\nand on a laptop, nothing has changed')
const wide = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: signedIn })
const widePage = await wide.newPage()
await widePage.goto(`${BASE}/builder/${pageId}`, { waitUntil: 'domcontentloaded' })
await widePage.waitForSelector('text=Components', { timeout: 90_000 })
await widePage.waitForTimeout(2000)
const desktop = await widePage.evaluate(() => {
  const hidden = (sel) => {
    const el = document.querySelector(sel)
    return !el || getComputedStyle(el).display === 'none'
  }
  const header = document.querySelector('[class^="_PuckHeader_"]')
  return {
    barsHidden: hidden('.editor-topbar') && hidden('.editor-actionbar'),
    headerVisible: Boolean(header) && header.getBoundingClientRect().height > 20,
    sidebarPosition: (() => {
      const s = document.querySelector('.Puck [class^="_Sidebar_"]')
      return s ? getComputedStyle(s).position : null
    })(),
  }
})
check(desktop.barsHidden, 'the phone bars are not rendered on a laptop')
check(desktop.headerVisible, "and Puck's own header is back")
check(
  desktop.sidebarPosition !== 'fixed',
  'with its panels beside the canvas, not over it',
  `${desktop.sidebarPosition}`,
)
check(
  (await widePage.locator('button:has-text("Save draft")').count()) > 0,
  'and the laptop controls where they always were',
)
await wide.close()

// --- tidy up -------------------------------------------------------------

await desk.request.delete(`${BASE}/api/pages/${pageId}`, { headers: { Origin: BASE } })

await browser.close()
console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
