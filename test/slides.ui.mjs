/**
 * The masterclass deck, in a real browser.
 *
 *   npm run dev   (in another terminal)
 *   npm run test:slides
 *
 * A deck is presented live, once, with an audience watching — so the failures
 * worth catching here are the ones nobody notices until that moment:
 *
 *   - a slide whose last line is off the bottom of the stage, at whatever size
 *     the presenting machine's window happens to be;
 *   - a key that does not advance, or advances twice;
 *   - a reloaded `#slide-9` that comes back as slide one;
 *   - the brand spelled any way other than eCommHarvest.
 *
 * Screenshots of every slide are written to test/.slides/ so the deck can be
 * reviewed without a browser.
 */

import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
const URL = `${BASE}/masterclass/slides`
const SHOTS = process.env.SLIDE_SHOTS || 'test/.slides'
const EXPECTED_SLIDES = 18

let passed = 0
let failed = 0
const check = (ok, label, detail = '') => {
  console.log(`${ok ? ' ok ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`)
  ok ? passed++ : failed++
}

mkdirSync(SHOTS, { recursive: true })

/** Anything React logs while the deck loads is a bug the presenter inherits. */
const consoleErrors = []

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
)
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.on('pageerror', (error) => consoleErrors.push(String(error).split('\n')[0]))
page.on('console', (message) => {
  if (message.type() !== 'error') return
  const text = message.text()
  // Network noise from the sandbox's proxy, not the page's own doing.
  if (text.includes('Failed to load resource')) return
  consoleErrors.push(text.split('\n')[0])
})

const counter = () => page.locator('.deck-count').innerText()

console.log('the deck loads')
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForSelector('.sl')
check(await page.locator('.deck-stage').isVisible(), 'the stage is on screen')
check((await counter()).endsWith(`/ ${EXPECTED_SLIDES}`), `${EXPECTED_SLIDES} slides`, await counter())

// --- the page is a deck, not a document ----------------------------------

const scrolls = await page.evaluate(() => ({
  doc: document.documentElement.scrollHeight - window.innerHeight,
  body: document.body.scrollHeight - window.innerHeight,
}))
check(scrolls.doc <= 0 && scrolls.body <= 0, 'nothing scrolls', JSON.stringify(scrolls))

/**
 * The stage fills the window — 16:9, and as large as the window allows.
 *
 * Worth a check of its own because the failure is silent: the deck's root class
 * once collided with a class in the design system, the stage quietly laid
 * itself out at 451px wide inside a 1440px window, and every other test here
 * still passed because they all measure against the stage.
 */
const stage = await page.evaluate(() => {
  const r = document.querySelector('.deck-stage').getBoundingClientRect()
  return { w: r.width, h: r.height, vw: window.innerWidth, vh: window.innerHeight }
})
check(
  Math.abs(stage.w / stage.h - 16 / 9) < 0.02,
  'the stage is 16:9',
  `${Math.round(stage.w)}x${Math.round(stage.h)}`,
)
check(
  stage.w >= Math.min(stage.vw, (stage.vh * 16) / 9) - 2,
  'the stage fills the window',
  `${Math.round(stage.w)} of ${stage.vw}`,
)

// --- keyboard -------------------------------------------------------------

console.log('\nkeyboard')
await page.keyboard.press('ArrowRight')
check((await counter()).startsWith('2 '), 'right arrow advances', await counter())
await page.keyboard.press(' ')
check((await counter()).startsWith('3 '), 'space advances', await counter())
await page.keyboard.press('ArrowLeft')
check((await counter()).startsWith('2 '), 'left arrow goes back', await counter())

// Space while a control has focus must move exactly one slide: the keydown
// handler prevents the focused button from also being pressed.
await page.locator('.deck-chrome .deck-btn').first().focus()
await page.keyboard.press(' ')
check((await counter()).startsWith('3 '), 'space with a button focused moves one slide', await counter())

await page.keyboard.press('End')
check((await counter()).startsWith(`${EXPECTED_SLIDES} `), 'End reaches the last slide', await counter())
await page.keyboard.press('ArrowRight')
check((await counter()).startsWith(`${EXPECTED_SLIDES} `), 'the last slide does not run off the end', await counter())
await page.keyboard.press('Home')
check((await counter()).startsWith('1 '), 'Home returns to the title', await counter())
await page.keyboard.press('ArrowLeft')
check((await counter()).startsWith('1 '), 'the first slide does not run off the start', await counter())

// --- the visible controls -------------------------------------------------

console.log('\ncontrols')
await page.mouse.move(700, 450)
await page.locator('.deck-chrome .deck-btn').nth(1).click()
check((await counter()).startsWith('2 '), 'the Next button advances', await counter())
await page.locator('.deck-chrome .deck-btn').first().click()
check((await counter()).startsWith('1 '), 'the Previous button goes back', await counter())
check(
  await page.locator('.deck-chrome .deck-btn').first().isDisabled(),
  'Previous is disabled on the first slide',
)
await page.locator('.deck-hit-next').click()
check((await counter()).startsWith('2 '), 'the edge control advances', await counter())

// --- jumping --------------------------------------------------------------

console.log('\njump to a slide')
await page.keyboard.press('g')
check(await page.locator('.deck-overlay').isVisible(), 'G opens the slide grid')
check(
  (await page.locator('.deck-tile').count()) === EXPECTED_SLIDES,
  `the grid lists ${EXPECTED_SLIDES} slides`,
  String(await page.locator('.deck-tile').count()),
)
const notes = await page.locator('.deck-tile-note').count()
check(notes >= 1, 'private notes show in the grid, not on the slides', `${notes} flagged`)
await page.locator('.deck-tile').nth(11).click()
check((await counter()).startsWith('12 '), 'clicking a tile jumps to that slide', await counter())
check(!(await page.locator('.deck-overlay').isVisible()), 'the grid closes behind you')

// --- the address bar ------------------------------------------------------

console.log('\nreload and share')
check(page.url().endsWith('#slide-12'), 'the address bar tracks the slide', page.url())
await page.goto(`${URL}#slide-9`, { waitUntil: 'networkidle' })
await page.waitForFunction(() => document.querySelector('.deck-count')?.textContent?.startsWith('9 '))
check((await counter()).startsWith('9 '), 'opening #slide-9 opens slide nine', await counter())

// --- fullscreen -----------------------------------------------------------

const fsButton = page.locator('.deck-chrome button[aria-label="Present fullscreen"]')
check((await fsButton.count()) === 1, 'there is a fullscreen control')

// --- every slide fits, at three window sizes ------------------------------

const SIZES = [
  { width: 1280, height: 720, name: '1280x720' },
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1920, height: 1080, name: '1920x1080' },
]

/** Anything drawn outside the stage is a line the audience will not see. */
const overflowing = () =>
  page.evaluate(() => {
    const stage = document.querySelector('.deck-stage').getBoundingClientRect()
    const out = []
    for (const el of document.querySelectorAll('.sl *')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      if (
        r.top < stage.top - 1 ||
        r.bottom > stage.bottom + 1 ||
        r.left < stage.left - 1 ||
        r.right > stage.right + 1
      )
        out.push(
          `${el.className || el.tagName} (${Math.round(r.top - stage.top)}→${Math.round(
            r.bottom - stage.bottom,
          )})`,
        )
    }
    return out.slice(0, 4)
  })

for (const size of SIZES) {
  console.log(`\nevery slide fits at ${size.name}`)
  await page.setViewportSize({ width: size.width, height: size.height })
  let bad = 0
  for (let i = 1; i <= EXPECTED_SLIDES; i++) {
    await page.goto(`${URL}#slide-${i}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.sl')
    await page.waitForFunction(
      (n) => document.querySelector('.deck-count')?.textContent?.startsWith(`${n} `),
      i,
    )
    // Let the entrance animation land before anything is measured or captured.
    await page.waitForTimeout(420)
    const out = await overflowing()
    if (out.length) {
      bad++
      console.log(`     slide ${i}: ${out.join(' | ')}`)
    }
    if (size.name === '1440x900') {
      await page.locator('.deck-stage').screenshot({
        path: `${SHOTS}/slide-${String(i).padStart(2, '0')}.png`,
      })
    }
  }
  check(bad === 0, `all ${EXPECTED_SLIDES} slides fit the stage`, bad ? `${bad} overflowing` : '')
}

// --- the words ------------------------------------------------------------

console.log('\nthe brand, and the copy')
await page.setViewportSize({ width: 1440, height: 900 })
let wrongSpelling = []
let seenBrand = 0
const placeholders = new Set()
/** An internal note reaching the screen is the one failure an audience sees. */
const leaked = []
for (let i = 1; i <= EXPECTED_SLIDES; i++) {
  await page.goto(`${URL}#slide-${i}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.sl')
  await page.waitForFunction(
    (n) => document.querySelector('.deck-count')?.textContent?.startsWith(`${n} `),
    i,
  )
  const text = await page.locator('.sl').innerText()
  // The bracketed tokens are the placeholder boxes, which are meant to show.
  // Anything else from `note:` — "DEREK SLIDE", "REPLACE AFTER" — is not.
  if (/derek slide|replace with|replace after|stand-in|screen-share the workbook here/i.test(
    text.replace(/\[[^\]]*\]/g, ''),
  ))
    leaked.push(`slide ${i}`)
  // Case-insensitive on purpose: the point is to catch eCommharvest,
  // Ecommharvest and ECOMMHARVEST, not to miss them.
  for (const match of text.match(/[a-z]*ecomm?harvest[a-z]*/gi) ?? []) {
    seenBrand++
    if (match !== 'eCommHarvest') wrongSpelling.push(`slide ${i}: "${match}"`)
  }
  for (const found of await page.locator('[data-placeholder]').evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-placeholder')),
  ))
    placeholders.add(`${i}: ${found}`)
}
check(leaked.length === 0, 'no internal note reaches a slide', leaked.join(', '))
check(seenBrand >= EXPECTED_SLIDES, 'the brand appears on every slide', `${seenBrand} mentions`)
check(wrongSpelling.length === 0, 'always spelled eCommHarvest', wrongSpelling.join('; '))
console.log(`     placeholders still open: ${[...placeholders].join(' | ') || 'none'}`)

check(
  consoleErrors.length === 0,
  'no React errors in the console',
  [...new Set(consoleErrors)].slice(0, 2).join(' | '),
)

await browser.close()
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
