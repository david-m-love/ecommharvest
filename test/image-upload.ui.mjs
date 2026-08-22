/**
 * Uploading an image from inside the builder, in one step.
 *
 *   npm run dev   (in another terminal, migrated and seeded)
 *   npm run test:images
 *
 * The claim: a person editing a page can add an image that is not in the Media
 * library yet, without leaving the canvas — and the file lands in the library
 * too, so it can be reused. Before this, an image field could only pick from
 * what was already uploaded, so a new logo meant going to the admin, uploading,
 * coming back, and finding the block again.
 *
 * Also checks the navigation that page had none of: the builder lives outside
 * Payload's admin shell, so it inherited no sidebar and was a dead end.
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

/** A distinctive filename, so "did *this* upload arrive" is answerable. */
const NAME = `quick-add-${Date.now().toString(36)}.png`
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAB4AAAAKCAYAAAB7ZKcRAAAAOklEQVR42u3OMQEAAAgDoJnc/9BeYQPUgAEDBgwYMGDAgAEDBgwYMGDAgAEDBgwYMGDAgAEDBgwY+HkLzQABlQnPCwAAAABJRU5ErkJggg==',
  'base64',
)
const FILE = `/tmp/${NAME}`
writeFileSync(FILE, PNG)

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
)
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

console.log('sign in')
await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' })
await page.fill('#field-email', ADMIN)
await page.fill('#field-password', PASSWORD)
await page.click('button[type=submit]')
await page.waitForURL(/\/admin(?!\/login)/, { timeout: 90_000 })

// --- the page list is not a dead end ------------------------------------

console.log('\nnavigation on the page list')
await page.goto(`${BASE}/builder`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('h1', { timeout: 60_000 })
for (const label of ['Pages', 'Images & files', 'Site Styles', 'Admin']) {
  check(
    (await page.locator(`.appbar-nav a:has-text("${label}")`).count()) > 0,
    `the page list links to ${label}`,
  )
}
check(
  (await page.locator('.appbar-nav button:has-text("Sign out")').count()) > 0,
  'and offers a way to sign out',
)

// --- upload from inside the builder -------------------------------------

console.log('\nupload an image without leaving the canvas')
const pages = await (
  await ctx.request.get(`${BASE}/api/pages?limit=1&where[slug][equals]=masterclass`, {
    headers: { Origin: BASE },
  })
).json()
const pageId = pages.docs?.[0]?.id
check(Boolean(pageId), 'found a page to edit', String(pageId))

await page.goto(`${BASE}/builder/${pageId}`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=Components', { timeout: 90_000 })
await page.waitForTimeout(3000)

/**
 * The Speakers block has photo fields, which is where an image would actually be
 * added. Selected by clicking the speaker card on the canvas, the way a person
 * would.
 */
await page.locator('.speaker').first().click()
await page.waitForTimeout(1500)

// The array field's items need opening before their fields are reachable.
const firstPerson = page.locator('[class*="ArrayField"] [class*="ArrayFieldItem"]').first()
if (await firstPerson.count()) {
  await firstPerson.click()
  await page.waitForTimeout(1200)
}

const uploadButton = page.locator('button:has-text("Upload an image")').first()
check((await uploadButton.count()) > 0, 'the image field offers "Upload an image"')
check(
  (await page.locator('button:has-text("Choose from library")').count()) > 0,
  'and still offers the library',
)

if ((await uploadButton.count()) > 0) {
  // The input is hidden behind the button, which is the point — but a test can
  // set files on it directly, exactly as the click handler would lead to.
  const input = page.locator('input[type=file]').first()
  await input.setInputFiles(FILE)

  // Wait for the upload to land rather than guessing at a duration.
  await page.waitForFunction(
    (name) => document.body.innerText.includes(name.replace(/\.png$/, '')) ||
      Array.from(document.images).some((img) => img.src.includes(name)),
    NAME,
    { timeout: 60_000 },
  ).catch(() => {})
  await page.waitForTimeout(2000)

  const inSlot = await page.evaluate(
    (name) => Array.from(document.images).some((img) => img.src.includes(name)),
    NAME,
  )
  check(inSlot, 'the uploaded image appears in the field straight away', NAME)

  const media = await (
    await ctx.request.get(`${BASE}/api/media?limit=5&sort=-createdAt`, { headers: { Origin: BASE } })
  ).json()
  const inLibrary = (media.docs || []).some((doc) => (doc.filename || '').includes(NAME.replace('.png', '')))
  check(inLibrary, 'and the same upload is in the Media library, for reuse')

  const altBox = page.locator('input[placeholder="Describe the image"]').first()
  check((await altBox.count()) > 0, 'alt text can be set on the block')
  if (await altBox.count()) {
    const seeded = await altBox.inputValue()
    check(seeded.length > 0, 'alt text is seeded from the filename, never empty', seeded)
  }
}

await browser.close()
console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
