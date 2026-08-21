/**
 * The admin actually boots in a browser — the check that a 200 does not make.
 *
 *   npm run build && npm run start   (with BLOB_READ_WRITE_TOKEN set)
 *   TEST_BASE_URL=http://localhost:3000 npm run test:admin
 *
 * Why a browser: the admin is a client application. When its component registry
 * is missing an entry, the server still answers 200 and sends a perfectly good
 * HTML shell — then React throws while hydrating and the screen goes white. Every
 * server-side check passes. Only a real browser sees it, and only by looking at
 * what rendered and what the console said.
 *
 * This is the exact failure that took the live admin down after the Vercel Blob
 * store was connected: the blob plugin's upload handler was absent from the
 * import map, and the admin died on `getFromImportMap`.
 *
 * Verified against a build with that entry removed, which is worth recording
 * because it decided what this file asserts: the page returned 200 with a body
 * of **zero characters**, and the browser console said nothing at all — Payload
 * logs the missing-component message server-side, which is why it turned up in
 * Vercel's log rather than in devtools. So "something rendered" is the check
 * that catches this. The console assertion below only catches the variant that
 * does throw in the browser, and passes either way here; it is kept because it
 * names the cause when it does fire, not because it is the detector.
 */

import { chromium } from 'playwright'

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'

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
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

/** Console errors are the evidence here, so collect them before navigating. */
const consoleErrors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => consoleErrors.push(String(err)))

/** Named URLs, so a 404 is a thing you can go and look at. */
const failedRequests = []
page.on('response', (res) => {
  if (res.status() >= 400) failedRequests.push(`${res.status()} ${new URL(res.url()).pathname}`)
})

const res = await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
check(res?.status() === 200, '/admin answers 200', String(res?.status()))

// Give hydration time to fail, if it is going to.
await page.waitForTimeout(6000)

/**
 * Not signed in, so this lands on the login screen. Either way the test is the
 * same: did the admin render its own furniture, or an empty body?
 */
const visibleText = (await page.locator('body').innerText().catch(() => '')).trim()
check(visibleText.length > 20, 'the admin renders something rather than a blank page', `${visibleText.length} characters`)

const inputs = await page.locator('input').count()
check(inputs > 0, 'the admin renders interactive fields', `${inputs} input(s)`)

const registryErrors = consoleErrors.filter(
  (text) => /getFromImportMap|not found in importMap/i.test(text),
)
check(
  registryErrors.length === 0,
  'no admin component is missing from the import map',
  registryErrors[0] || 'none',
)

// Anything else on the console is worth seeing, without failing the run for a
// stray warning from a third-party script. Failed requests are named by URL,
// because "a resource 404'd" is not something you can act on.
const others = consoleErrors.filter((t) => !registryErrors.includes(t))
if (others.length) console.log(`      note: ${others.length} other console error(s): ${others[0]}`)
if (failedRequests.length)
  console.log(`      note: ${failedRequests.length} request(s) failed: ${failedRequests.join(', ')}`)

await browser.close()
console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
