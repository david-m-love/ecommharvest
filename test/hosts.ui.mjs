/**
 * Partner logos in the hosted-by bar.
 *
 *   npm run dev   (in another terminal, migrated and seeded)
 *   npm run test:hosts
 *
 * The bar used to squeeze every logo into a 44px navy circle with the brand name
 * set beside it in our own typeface. Almost every brand's logo is a lockup —
 * symbol *and* wordmark, in their own colour — so that cropped the thing they
 * care about, recoloured what survived, and then repeated the name they had just
 * been stopped from showing.
 *
 * What replaced it has to hold up against logos of genuinely different shapes,
 * which is what this checks: a long wordmark, a square symbol, and a white
 * logo that needs something dark behind it, all in one row. Real files, real
 * dimensions, measured in a browser — because "looks deliberate" is a claim
 * about pixels and nothing else can check it.
 */

import { chromium } from 'playwright'
import sharp from 'sharp'

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
const ADMIN = process.env.SEED_ADMIN_EMAIL || 'david@lovemarketing.digital'
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'change-me-locally-8f2a'

let passed = 0
let failed = 0
const check = (ok, label, detail = '') => {
  console.log(`${ok ? ' ok ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`)
  ok ? passed++ : failed++
}

/**
 * Three shapes, because the point is that mismatched logos end up looking
 * intentional. A 5:1 wordmark and a 1:1 symbol are the two extremes a partner
 * bar actually gets.
 */
const png = (width, height, colour) =>
  sharp({ create: { width, height, channels: 4, background: colour } }).png().toBuffer()

const stamp = Date.now().toString(36)
const LOGOS = [
  { key: 'wide', file: `wide-${stamp}.png`, w: 600, h: 120, colour: { r: 22, g: 50, b: 79, alpha: 1 } },
  { key: 'square', file: `square-${stamp}.png`, w: 240, h: 240, colour: { r: 201, g: 145, b: 50, alpha: 1 } },
  { key: 'white', file: `white-${stamp}.png`, w: 420, h: 140, colour: { r: 255, g: 255, b: 255, alpha: 1 } },
]

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
)
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()

await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' })
await page.fill('#field-email', ADMIN)
await page.fill('#field-password', PASSWORD)
await page.click('button[type=submit]')
await page.waitForURL(/\/admin(?!\/login)/, { timeout: 90_000 })

// --- three logos in the library -----------------------------------------

console.log('logos of three different shapes')
const uploaded = {}
for (const logo of LOGOS) {
  const res = await ctx.request.post(`${BASE}/api/media`, {
    headers: { Origin: BASE },
    multipart: {
      file: { name: logo.file, mimeType: 'image/png', buffer: await png(logo.w, logo.h, logo.colour) },
      _payload: JSON.stringify({ alt: `${logo.key} brand logo` }),
    },
  })
  const doc = (await res.json().catch(() => ({}))).doc
  uploaded[logo.key] = doc
  check(
    doc?.width === logo.w && doc?.height === logo.h,
    `${logo.key} logo uploaded at ${logo.w}×${logo.h}`,
    `${doc?.width}×${doc?.height}`,
  )
}

// --- a page with all three ----------------------------------------------

const asPicked = (key) => ({
  url: uploaded[key].url,
  alt: uploaded[key].alt,
  width: uploaded[key].width,
  height: uploaded[key].height,
})

const created = await ctx.request.post(`${BASE}/api/pages`, {
  headers: { Origin: BASE, 'Content-Type': 'application/json' },
  data: {
    title: `hosts-${stamp}`,
    status: 'published',
    content: {
      root: {},
      content: [
        {
          type: 'HostedBy',
          props: {
            id: 'hosts-1',
            label: 'Hosted by',
            hosts: [
              { name: 'Wide Wordmark Co', logo: asPicked('wide'), href: 'wideco.example.com' },
              { name: 'Square Symbol Inc', logo: asPicked('square') },
              { name: 'Reversed Logo Ltd', logo: asPicked('white'), logoBackground: 'dark' },
              { name: 'No Logo Yet', monogram: 'NLY' },
            ],
          },
        },
      ],
    },
  },
})
const record = (await created.json()).doc
check(Boolean(record?.id), 'a page carrying all three', `id ${record?.id}`)

const visitor = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const view = await visitor.newPage()
const res = await view.goto(`${BASE}/p/${record.slug}`, { waitUntil: 'load' })
check(res?.status() === 200, 'the page renders', `${res?.status()}`)

/**
 * Wait for the logos themselves, not for a duration.
 *
 * Every measurement here is of a loaded image, and the first version waited a
 * fixed 1.5 seconds — which was enough on a warm server and not enough on a cold
 * one, where the first request to the image optimiser has to compile it. Six
 * checks then reported 0×0 as a layout failure that did not exist.
 */
const logosReady = () =>
  view
    .waitForFunction(
      () => {
        const images = Array.from(document.querySelectorAll('.hostlogo img'))
        return images.length > 0 && images.every((img) => img.complete && img.naturalWidth > 0)
      },
      { timeout: 60_000 },
    )
    .catch(() => {})
await logosReady()

// --- what the row looks like --------------------------------------------

console.log('\nthe row')
const measure = () =>
  view.evaluate(() =>
    Array.from(document.querySelectorAll('.hosts .host')).map((host) => {
      const img = host.querySelector('img')
      const box = host.querySelector('.hostlogo')
      const name = host.querySelector('.host-name')
      const round = (n) => Math.round(n)
      return {
        text: (host.textContent || '').trim(),
        hasImage: Boolean(img),
        loaded: img ? img.naturalWidth > 0 : null,
        imgW: img ? round(img.getBoundingClientRect().width) : null,
        imgH: img ? round(img.getBoundingClientRect().height) : null,
        boxBg: box ? getComputedStyle(box).backgroundColor : null,
        showsName: Boolean(name),
        label: host.getAttribute('aria-label'),
        alt: img?.getAttribute('alt') || null,
      }
    }),
  )

const row = await measure()
check(row.length === 4, 'four partners in the row', `${row.length}`)

const [wide, square, white, none] = row

check(wide.loaded && square.loaded && white.loaded, 'every logo loads')

/**
 * The heart of it. A 5:1 wordmark and a 1:1 symbol given the same height would
 * leave the wordmark five times the area of the symbol and completely dominant.
 * Both caps apply instead, so the wide one is limited by width and the square
 * one by height, and neither runs away with the row.
 */
check(
  wide.imgW <= 210 && square.imgH <= 46,
  'the wide logo is held by the width cap and the square one by the height cap',
  `wide ${wide.imgW}×${wide.imgH}, square ${square.imgW}×${square.imgH}`,
)
check(
  wide.imgH < square.imgH,
  'so the long wordmark is not the tallest thing in the row',
  `${wide.imgH}px vs ${square.imgH}px`,
)
check(
  Math.max(wide.imgW, square.imgW, white.imgW) / Math.min(wide.imgW, square.imgW, white.imgW) < 6,
  'and no logo is wildly wider than the rest',
  `${Math.min(wide.imgW, square.imgW, white.imgW)}–${Math.max(wide.imgW, square.imgW, white.imgW)}px`,
)

/** Aspect ratios must survive: a squashed logo is worse than a small one. */
for (const [label, m, source] of [
  ['wide', wide, LOGOS[0]],
  ['square', square, LOGOS[1]],
  ['white', white, LOGOS[2]],
]) {
  const want = source.w / source.h
  const got = m.imgW / m.imgH
  check(Math.abs(want - got) / want < 0.06, `the ${label} logo keeps its proportions`, `${got.toFixed(2)} vs ${want.toFixed(2)}`)
}

console.log('\nnames, and what a logo already says')
check(!wide.showsName, 'a logo with a wordmark is not followed by the name in our own type')
check(
  wide.label === 'Wide Wordmark Co',
  'but the link is still named, for anyone not looking at it',
  `${wide.label}`,
)
check(none.showsName && none.text.includes('No Logo Yet'), 'a partner with no logo shows initials and their name')

console.log('\na white logo needs something behind it')
check(
  white.boxBg === 'rgb(22, 50, 79)',
  'the dark card is there when it is asked for',
  `${white.boxBg}`,
)
check(
  wide.boxBg === 'rgba(0, 0, 0, 0)',
  'and nothing is put behind a logo that does not need it',
  `${wide.boxBg}`,
)

// --- on a phone ----------------------------------------------------------

console.log('\non a phone')
await view.setViewportSize({ width: 414, height: 900 })
// A narrower screen picks a smaller file out of the srcset, so the images load
// again before there is anything to measure.
await view.waitForTimeout(600)
await logosReady()
const small = await measure()
check(
  small[0].imgW <= 150 && small[0].imgW < wide.imgW,
  'logos come down in size rather than filling the screen',
  `${small[0].imgW}px from ${wide.imgW}px`,
)
const overflow = await view.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth + 1,
)
check(!overflow, 'and the row does not push the page sideways')

const ratioHolds = Math.abs(small[1].imgW / small[1].imgH - 1) < 0.06
check(ratioHolds, 'proportions hold at phone size too', `${(small[1].imgW / small[1].imgH).toFixed(2)}`)

// --- tidy up -------------------------------------------------------------

await ctx.request.delete(`${BASE}/api/pages/${record.id}`, { headers: { Origin: BASE } })
for (const logo of LOGOS) {
  await ctx.request.delete(`${BASE}/api/media/${uploaded[logo.key].id}`, { headers: { Origin: BASE } })
}

await browser.close()
console.log(failed === 0 ? `\nall ${passed} checks passed` : `\n${failed} of ${passed + failed} checks failed`)
process.exit(failed === 0 ? 0 : 1)
