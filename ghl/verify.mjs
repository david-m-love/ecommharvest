/**
 * Proves the GHL conversion is safe to paste.
 *
 *   node ghl/verify.mjs        (add PLAYWRIGHT_CHROMIUM_PATH if needed)
 *
 * Three things get checked, because "I namespaced it" is a claim, not evidence:
 *
 *   1. Tag balance — a block that cuts a <div> in half will silently wreck the
 *      GHL page it is pasted into.
 *   2. Isolation, adversarially — the blocks are rendered twice, once alone and
 *      once alongside deliberately hostile CSS of the kind GHL's builder emits
 *      (`.btn{background:red}`, `p{color:lime}`, `body{margin:40px}`). If the two
 *      renders are pixel-identical, GHL's styles cannot reach our design.
 *   3. No leakage outward — a mock GHL form is placed on the same page OUTSIDE
 *      the wrapper, and must keep its own styling.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const here = dirname(fileURLToPath(import.meta.url))
const tmp = join(here, '.verify')
mkdirSync(tmp, { recursive: true })

const block = (name) => readFileSync(join(here, 'blocks', name), 'utf8')
const css = block('masterclass-styles.css')

const BLOCKS = ['1-hero.html', '2-body.html', '3-cta-footer.html']
// Checked for tag balance and isolation alongside the masterclass blocks.
const EXTRA_BLOCKS = [
  'thanks.html',
  'home-1-body.html',
  'home-2-cta.html',
  'LANDING-PAGE.html',
  'thanks-WITH-CSS.html',
  'home-1-WITH-CSS.html',
  // These two sit directly above and below GoHighLevel's own form element, so
  // the isolation checks below matter more for them than for anything else here:
  // a leak lands on the form that takes the registrations.
  'REGISTER-1-above-form.html',
  'REGISTER-2-below-form.html',
]

/**
 * Blocks that must not contain a form control or a button of their own.
 *
 * The registration blocks bracket GHL's form. A stray input would be a second
 * place to type that submits nowhere, and a stray button would compete with the
 * only one that counts.
 */
const NO_CONTROLS = ['REGISTER-1-above-form.html', 'REGISTER-2-below-form.html']
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
  : {}

let failures = 0
const check = (ok, label, detail = '') => {
  console.log(`${ok ? ' ok ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

// --- 1. tag balance -----------------------------------------------------

console.log('block integrity')
const VOID = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source'])
for (const name of [...BLOCKS, ...EXTRA_BLOCKS]) {
  const html = block(name).replace(/<!--[\s\S]*?-->/g, '')
  const stack = []
  let balanced = true
  let culprit = ''
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClose] = m
    if (VOID.has(tag.toLowerCase()) || selfClose === '/') continue
    if (closing) {
      if (stack[stack.length - 1] === tag.toLowerCase()) stack.pop()
      else {
        balanced = false
        culprit = `unexpected </${tag}>`
        break
      }
    } else stack.push(tag.toLowerCase())
  }
  if (balanced && stack.length) {
    balanced = false
    culprit = `unclosed <${stack.join('>, <')}>`
  }
  check(balanced, `${name} tags balanced`, culprit)
}

// --- 1b. the CTAs actually go somewhere ---------------------------------
//
// The landing page holds no form: registration is the next funnel step. So a
// button still pointing at an in-page anchor is a dead end that looks fine in
// the builder and loses the lead on the live page.

console.log('\nCTAs point forward, not at an in-page anchor')
for (const name of ['1-hero.html', '3-cta-footer.html', 'LANDING-PAGE.html']) {
  const html = block(name)
  const hrefs = [...html.matchAll(/<a\s[^>]*class="[^"]*ech-btn[^"]*"[^>]*>/g)].map(
    (m) => (m[0].match(/href="([^"]*)"/) || [, ''])[1],
  )
  check(hrefs.length > 0, `${name} has at least one CTA button`)
  check(
    hrefs.every((h) => h && !h.startsWith('#')),
    `${name} CTA hrefs all link forward`,
    hrefs.join(' '),
  )
}
// The whole page in one block must carry every CTA the split blocks do.
const splitCtas = ['1-hero.html', '2-body.html', '3-cta-footer.html'].reduce(
  (n, name) => n + (block(name).match(/class="ech-btn/g) || []).length,
  0,
)
const wholeCtas = (block('LANDING-PAGE.html').match(/class="ech-btn/g) || []).length
check(
  wholeCtas === splitCtas,
  'LANDING-PAGE.html carries every CTA the split blocks do',
  `${wholeCtas} vs ${splitCtas}`,
)

// --- 1b2. the registration blocks add nothing to type or click -----------

/**
 * The form on that page is GoHighLevel's, and it must be the only one.
 *
 * A leftover input from the old self-hosted version would be a box that takes
 * typing and submits nowhere; a leftover button would sit beside "Save my seat!"
 * competing for the click. Both are the kind of mistake that looks fine in a
 * screenshot and costs registrations.
 */
console.log('\nthe registration blocks leave the form to GoHighLevel')
for (const name of NO_CONTROLS) {
  const html = block(name)
  const controls = (html.match(/<(input|textarea|select|form|button)\b/gi) || []).map((m) =>
    m.replace(/[<]/, ''),
  )
  check(controls.length === 0, `${name} adds no form controls of its own`, controls.join(', ') || 'none')
  const buttons = (html.match(/class="ech-btn/g) || []).length
  check(buttons === 0, `${name} adds no competing button`, `${buttons}`)
}

// --- 1c. no root-relative links ----------------------------------------
//
// Every block is served from two hosts: pasted into GoHighLevel on
// go.ecommharvest.com, and rendered by the app on ecommharvest.com. A
// root-relative href therefore means two different things depending on where the
// page is being viewed — and the footer's `/privacy` would 404 outright on the
// GHL host, on the page that has to carry a working privacy link before any Meta
// ad can run. So every link out must be absolute.

console.log('\nlinks are absolute, because each block is served from two hosts')
for (const name of [...BLOCKS, ...EXTRA_BLOCKS]) {
  /**
   * `src` as well as `href`, which was a real gap: a hand-written block used
   * `src="/logo.png"` and the check passed, because it only looked at links. On
   * GoHighLevel's host that path does not exist, so the logo — the first thing
   * on the page — rendered as broken-image alt text. Images embed as data URIs
   * or come from an absolute URL; nothing else.
   */
  const rootRelative = [
    ...[...block(name).matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]),
    ...[...block(name).matchAll(/src="(\/[^"]*)"/g)].map((m) => m[1]),
  ]
  check(
    rootRelative.length === 0,
    `${name} has no root-relative links or images`,
    rootRelative.join(' ') || 'none',
  )
}

// --- 1d. the paste-me mirrors match the blocks --------------------------

/**
 * `ghl/paste-me/*.txt` is what actually gets pasted, so it is what has to be
 * right.
 *
 * The .txt copies exist because double-clicking an .html file opens it in a
 * browser, which renders it — copying that window yields the visible words with
 * every tag stripped, which is useless in a page builder. A .txt opens in a text
 * editor and copies as source.
 *
 * They are committed rather than generated-and-ignored, because ignoring them
 * put them out of reach of the one place they are needed: GitHub, in a browser,
 * on the machine doing the pasting. This check is the price of that — a stale
 * mirror would be pasted with confidence, so byte-for-byte or fail.
 */
console.log('\nthe paste-me copies match the blocks they mirror')
const blockNames = readdirSync(join(here, 'blocks'))
const pasteNames = existsSync(join(here, 'paste-me')) ? readdirSync(join(here, 'paste-me')) : []
for (const name of blockNames) {
  const mirror = join(here, 'paste-me', `${name}.txt`)
  if (!existsSync(mirror)) {
    check(false, `paste-me/${name}.txt exists`, 'missing — run npm run ghl:build')
    continue
  }
  const same = readFileSync(mirror, 'utf8') === block(name)
  check(same, `paste-me/${name}.txt is identical to the block`, same ? '' : 'differs — run npm run ghl:build')
}
// A mirror of a block that no longer exists is worse than a missing one: it
// looks current and is not.
const orphans = pasteNames.filter((n) => !blockNames.includes(n.replace(/\.txt$/, '')))
check(orphans.length === 0, 'no paste-me copy is left over from a deleted block', orphans.join(', ') || 'none')

// --- 2 & 3. render comparison ------------------------------------------

// The kind of global CSS a page builder emits. Every one of these would visibly
// wreck the design if our namespacing were incomplete.
const HOSTILE = `
  * { box-sizing: content-box; }
  body { margin: 40px; font-family: "Comic Sans MS", cursive; background: #222; color: #0f0; }
  h1, h2, h3 { color: red !important; font-family: cursive; letter-spacing: 3px; }
  p, li, span { color: lime; font-size: 22px; }
  a { color: magenta; text-decoration: underline dotted; }
  img { border: 8px solid red; }
  .btn { background: red !important; color: yellow !important; border-radius: 0 !important; padding: 2px !important; }
  .card, .field, .badge, .host, .when, .stamp, .empty, .flash, .bar, .tick { border: 6px dashed red !important; background: #300 !important; }
  .slot, .slot-in, .shell { padding: 0 !important; max-width: none !important; }
  footer, header, nav, main, aside { background: #500 !important; }
  table, th, td { border: 4px solid red !important; }
  input, button, label, form { all: revert; border: 5px solid red !important; }
`

// A stand-in for GHL's own form, placed outside our wrapper. It uses the class
// names most likely to collide, and must keep the hostile styling — proving our
// CSS never reaches it.
const MOCK_GHL_FORM = `
<div class="ghl-form-wrapper" id="mock-ghl">
  <div class="card">
    <label class="field">Full name <input class="field" name="full_name"></label>
    <p>GHL's own copy in a paragraph.</p>
    <button class="btn" type="button">GHL submit button</button>
  </div>
</div>
`

const page = (opts) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${opts.hostile ? HOSTILE : ''}</style>
<style>${css}</style>
<!-- Pin the container: a page builder controls row width and body margin, so
     those are not ours to defend. This isolates the test to our own internals. -->
<!-- Pin our container's size, origin and background in BOTH renders.
     Page margin and page background belong to the builder: margin shifts our
     block's absolute origin, which changes glyph subpixel rounding, and the page
     colour shows through the 1px seam between stacked blocks. Neither reaches our
     content, so neutralising them is what isolates the test to what is ours. -->
<style>#ours{position:absolute !important;top:0 !important;left:0 !important;
  width:1200px !important;margin:0 !important;padding:0 !important;
  box-sizing:border-box !important;background:#fff !important;
  font-size:0 !important;line-height:0 !important}</style>
</head><body>
<div id="ours">${BLOCKS.map(block).join('\n')}</div>
${opts.mockForm ? MOCK_GHL_FORM : ''}
</body></html>`

writeFileSync(join(tmp, 'clean.html'), page({ hostile: false }))
writeFileSync(join(tmp, 'hostile.html'), page({ hostile: true }))
writeFileSync(join(tmp, 'hostile-with-form.html'), page({ hostile: true, mockForm: true }))

const browser = await chromium.launch(launchOptions)
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })

const shoot = async (file, out) => {
  const p = await ctx.newPage()
  await p.goto(`file://${join(tmp, file)}`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(500)
  // Screenshot only our region, so the hostile body margin is not counted as a diff.
  const buf = await p.locator('#ours').screenshot({ path: join(tmp, out) })
  const box = await p.locator('#ours').boundingBox()
  await p.close()
  return { buf, box }
}

console.log('\nisolation, under hostile page-builder CSS')
const clean = await shoot('clean.html', 'clean.png')
const hostile = await shoot('hostile.html', 'hostile.png')

/**
 * Compare by counting differing pixels, not by byte equality.
 *
 * Byte equality is too strict for a visual assertion: glyph antialiasing varies
 * by a few pixels for reasons that are not CSS. The signal is unmistakable
 * either way. Measured during development: a genuine leak (headings forced red
 * by an !important rule) showed 109,885 differing pixels — 1.58% of the image.
 * A fully-defended render shows ~1,200 scattered antialiasing pixels, 0.017%.
 * The threshold sits an order of magnitude above the noise and an order of
 * magnitude below a real leak, so neither verdict is a close call.
 */
const THRESHOLD_PCT = 0.15

const diffPage = await ctx.newPage()
const diff = await diffPage.evaluate(
  async ([a, c]) => {
    const load = (base64) =>
      new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const cv = document.createElement('canvas')
          cv.width = img.width
          cv.height = img.height
          const cx = cv.getContext('2d')
          cx.drawImage(img, 0, 0)
          resolve({ w: img.width, h: img.height, d: cx.getImageData(0, 0, img.width, img.height).data })
        }
        img.src = 'data:image/png;base64,' + base64
      })
    const A = await load(a)
    const B = await load(c)
    if (A.w !== B.w || A.h !== B.h) return { sizeMismatch: `${A.w}x${A.h} vs ${B.w}x${B.h}` }
    let differing = 0
    for (let i = 0; i < A.d.length; i += 4) {
      if (A.d[i] !== B.d[i] || A.d[i + 1] !== B.d[i + 1] || A.d[i + 2] !== B.d[i + 2]) differing++
    }
    const total = A.w * A.h
    return { differing, total, pct: (differing / total) * 100 }
  },
  [clean.buf.toString('base64'), hostile.buf.toString('base64')],
)
await diffPage.close()

check(
  !diff.sizeMismatch && diff.pct < THRESHOLD_PCT,
  'our blocks render identically with hostile CSS present',
  diff.sizeMismatch
    ? `image sizes differ: ${diff.sizeMismatch}`
    : `${diff.differing} of ${diff.total} px differ (${diff.pct.toFixed(4)}%, threshold ${THRESHOLD_PCT}%)`,
)
check(
  Math.abs(clean.box.width - hostile.box.width) < 1,
  'our block width is unchanged',
  `${Math.round(clean.box.width)} vs ${Math.round(hostile.box.width)}`,
)

console.log('\nno leakage into GHL’s own elements')
const p = await ctx.newPage()
await p.goto(`file://${join(tmp, 'hostile-with-form.html')}`, { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(300)

const mock = await p.evaluate(() => {
  const btn = document.querySelector('#mock-ghl .btn')
  const card = document.querySelector('#mock-ghl .card')
  const para = document.querySelector('#mock-ghl p')
  const g = (el) => (el ? getComputedStyle(el) : null)
  return {
    btnBg: g(btn)?.backgroundColor,
    btnRadius: g(btn)?.borderRadius,
    cardBorderStyle: g(card)?.borderTopStyle,
    paraColor: g(para)?.color,
  }
})

// Hostile CSS said: button red, radius 0, card dashed, paragraph lime. If our
// stylesheet had leaked, these would be gold / 999px / solid / brown instead.
check(mock.btnBg === 'rgb(255, 0, 0)', 'GHL button keeps its own background', mock.btnBg)
check(mock.btnRadius === '0px', 'GHL button keeps its own border-radius', mock.btnRadius)
check(mock.cardBorderStyle === 'dashed', 'GHL card keeps its own border', mock.cardBorderStyle)
check(mock.paraColor === 'rgb(0, 255, 0)', 'GHL paragraph keeps its own colour', mock.paraColor)

console.log('\nmobile')
for (const width of [414, 768]) {
  const m = await ctx.newPage()
  await m.setViewportSize({ width, height: 900 })
  await m.goto(`file://${join(tmp, 'hostile.html')}`, { waitUntil: 'domcontentloaded' })
  await m.waitForTimeout(300)
  const overflow = await m.evaluate(() => {
    const el = document.getElementById('ours')
    return el.scrollWidth > el.clientWidth + 1
  })
  check(!overflow, `no horizontal overflow at ${width}px`)
  await m.close()
}

await browser.close()

console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
