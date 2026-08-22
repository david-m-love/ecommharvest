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
/**
 * A real 120×40 PNG, not a stub.
 *
 * The stub this replaced had a valid header and corrupt pixel data, which was
 * invisible for as long as the checks only read `src` attributes — and then quietly
 * broke the first check that asked whether the image had actually *decoded*.
 */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAHgAAAAoCAYAAAA16j4lAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAA2UlEQVR4nO2VwREDMRDCrqbtlLKoKqkiA1z00N+DLPux7gP32g2e9AHgEMwlOArmEhxPtP/wS+APVl4CgguG8igUrLwEBBcM5VEoWHkJCC4YyqNQsPISEFwwlEehYOUlILhgKI9CwcpLQHDBUB6FgpWXgOCCoTwKBSsvAcEFQ3kUClZeAoILhvIoFKy8BAQXDOVRKFh5CQguGMqjULDyEhBcMJRHoWDlJSC4YCiPQsHKS0BwwVAehYKVl4DggqE8CgUrLwHBBUN5FApWXgKCC4byKBSsvIRf8gXWQrECHMquJAAAAABJRU5ErkJggg==',
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

// --- images are resized, and reserve their space -------------------------

/**
 * The logo is the image every visitor sees first, and it was being served at
 * whatever size it was uploaded at, with no dimensions — so a 300KB file
 * downloaded on a phone, and the header grew as it arrived and shoved the page
 * down. Both are fixed by the same thing: recording the real dimensions when the
 * image is chosen, which is what lets Next's optimiser in.
 */
console.log('\nthe logo is optimised and holds its space')
{
  /**
   * Only meaningful when a logo is actually set. A database with none — a fresh
   * seed, a clean checkout — has nothing to optimise, and failing here would
   * report a missing setting as a broken feature.
   */
  const styles = await (
    await ctx.request.get(`${BASE}/api/globals/site-styles?depth=0`, { headers: { Origin: BASE } })
  ).json()

  if (!styles?.logo) {
    console.log(' --  skipped: no logo is set in Site Styles')
  } else {
    const visitor = await browser.newContext({ viewport: { width: 414, height: 900 } })
    const p = await visitor.newPage()
    await p.goto(`${BASE}/masterclass`, { waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(1200)

    const logo = await p.evaluate(() => {
      const img = document.querySelector('.brand img')
      if (!img) return null
      return {
        src: img.getAttribute('src') || '',
        width: img.getAttribute('width'),
        height: img.getAttribute('height'),
        loaded: img.naturalWidth > 0,
      }
    })
    check(Boolean(logo), 'the header has a logo image')
    if (logo) {
      check(logo.loaded, 'it loads', logo.src.slice(0, 60))
      check(
        Boolean(logo.width && logo.height),
        'and carries its dimensions, so the header cannot jump as it arrives',
        `${logo.width}×${logo.height}`,
      )
      check(
        logo.src.includes('/_next/image'),
        'and is served through the optimiser, not at full upload size',
        logo.src.slice(0, 60),
      )
    }
    await visitor.close()
  }
}

// --- a file still in use cannot be deleted -------------------------------

/**
 * Blocks store an image's URL, not a link to the media record, so nothing in the
 * database connects the two — deleting the file left a live page pointing at a
 * URL that 404s, with no warning and no way to find out except looking at the
 * page. The delete is refused instead, naming what is using the file.
 */
console.log('\ndeleting a file a page is using')
{
  const upload = await ctx.request.post(`${BASE}/api/media`, {
    headers: { Origin: BASE },
    multipart: {
      file: { name: `in-use-${Date.now().toString(36)}.png`, mimeType: 'image/png', buffer: PNG },
      _payload: JSON.stringify({ alt: 'A file that is in use' }),
    },
  })
  const uploaded = (await upload.json().catch(() => ({}))).doc
  check(Boolean(uploaded?.url), 'uploaded a file to try deleting', `${upload.status()}`)
  check(
    Boolean(uploaded?.width && uploaded?.height),
    'the library records its real dimensions',
    `${uploaded?.width}×${uploaded?.height}`,
  )

  if (uploaded?.url) {
    const title = `delete-guard-${Date.now().toString(36)}`
    const created = await ctx.request.post(`${BASE}/api/pages`, {
      headers: { Origin: BASE, 'Content-Type': 'application/json' },
      data: {
        title,
        content: {
          root: {},
          content: [
            {
              type: 'Header',
              props: {
                id: 'header-1',
                image: { url: uploaded.url, alt: 'A file that is in use', width: uploaded.width, height: uploaded.height },
              },
            },
          ],
        },
      },
    })
    const newPageId = (await created.json().catch(() => ({}))).doc?.id
    check(Boolean(newPageId), 'and put it on a page', `${created.status()}`)

    const refused = await ctx.request.delete(`${BASE}/api/media/${uploaded.id}`, {
      headers: { Origin: BASE },
    })
    const body = await refused.json().catch(() => ({}))
    const message = body.errors?.[0]?.message || body.message || ''
    check(
      refused.status() >= 400 || Boolean(body.errors?.length),
      'the delete is refused',
      `${refused.status()}`,
    )
    check(message.includes(title), 'and the refusal names the page using the file', message.slice(0, 120))

    // Still there, not half-deleted.
    const stillThere = await ctx.request.get(`${BASE}/api/media/${uploaded.id}`, {
      headers: { Origin: BASE },
    })
    check(stillThere.status() === 200, 'the file itself is untouched')

    // Take it off the page, and the delete goes through — the guard is about use,
    // not about the file.
    if (newPageId) {
      await ctx.request.delete(`${BASE}/api/pages/${newPageId}`, { headers: { Origin: BASE } })
    }
    const allowed = await ctx.request.delete(`${BASE}/api/media/${uploaded.id}`, {
      headers: { Origin: BASE },
    })
    check(allowed.status() === 200, 'once nothing uses it, it can be deleted', `${allowed.status()}`)
  }
}

await browser.close()
console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
