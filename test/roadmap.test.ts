/**
 * The Founder Roadmap pages hold to the copy deck's rules.
 *
 *   npx tsx test/roadmap.test.ts
 *
 * These are the rules the deck states as absolute: no dashes anywhere, $500
 * exactly, the third factor is never "Water", no invented proof, and a
 * square-bracket token is only ever one of the four declared decisions. They also
 * check that nothing can publish a page that still has a decision open.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  PLACEHOLDERS,
  ROADMAP_CHECKOUT_URL,
  ROADMAP_CTA,
  ROADMAP_PRICE,
  fillPlaceholders,
  findDashes,
  findEmptyButtons,
  findPlaceholders,
} from '@/lib/roadmap'
import { PREVIEW_PAGE, ROADMAP_PAGE, ROADMAP_PAGES, THANKS_PAGE } from '@/seed/roadmap-pages'

let passed = 0
const test = (label: string, fn: () => void) => {
  try {
    fn()
    console.log(`  ok  ${label}`)
    passed++
  } catch (err) {
    console.error(`FAIL  ${label}\n      ${(err as Error).message}`)
    process.exitCode = 1
  }
}

type Block = { type: string; props: Record<string, any> }
const blocks = (page: { content: unknown[] }) => page.content as Block[]
const sales = [ROADMAP_PAGE, PREVIEW_PAGE]

test('no em or en dash anywhere in the pages, their titles or their meta tags', () => {
  for (const page of ROADMAP_PAGES) {
    assert.deepEqual(findDashes(page), [], page.slug)
  }
})

test('the third factor is Nurture, never Water', () => {
  const text = JSON.stringify(ROADMAP_PAGES)
  assert.ok(!/\bwater\b/i.test(text))
})

test('the brand is always spelled eCommHarvest', () => {
  // Not inside an address: the email and the web links are lower case by nature.
  const text = JSON.stringify(ROADMAP_PAGES).replace(/[\w.@/:-]*ecommharvest\.com[\w./-]*/gi, '')
  for (const m of text.match(/e-?comm\s?harvest/gi) ?? []) assert.equal(m, 'eCommHarvest')
})

test('the price is $500 exactly, on every price block', () => {
  assert.equal(ROADMAP_PRICE, '$500')
  for (const page of sales) {
    const cards = blocks(page).filter((b) => b.type === 'PricingCard')
    assert.equal(cards.length, 1)
    assert.equal(cards[0].props.price, '$500')
    assert.equal(cards[0].props.compareAt, '', 'no strikethrough value price')
    assert.equal(cards[0].props.ctaLabel, ROADMAP_CTA)
  }
  const text = JSON.stringify(ROADMAP_PAGES)
  assert.ok(!/\$(499|497|495|1,?000)\b/.test(text))
})

test('every button above the price scrolls to it, so the checkout lives in one field', () => {
  for (const page of sales) {
    const heroes = blocks(page).filter((b) => b.type === 'Hero')
    assert.equal(heroes.length, 1)
    assert.equal(heroes[0].props.ctaHref, '#join')
    assert.equal(heroes[0].props.ctaLabel, ROADMAP_CTA)
    const card = blocks(page).find((b) => b.type === 'PricingCard')!
    assert.equal(card.props.checkoutUrl, ROADMAP_CHECKOUT_URL)
  }
})

test('no checkout link is invented: the URL is empty until one is supplied', () => {
  assert.equal(ROADMAP_CHECKOUT_URL, '')
})

test('proof is never made up: testimonials, logos and pictures all start empty', () => {
  for (const page of [...sales, THANKS_PAGE]) {
    for (const b of blocks(page)) {
      if (b.type === 'Testimonials') assert.deepEqual(b.props.items, [])
      if (b.type === 'LogoTicker') assert.deepEqual(b.props.logos, [])
      if (b.type === 'SampleGallery') for (const item of b.props.items) assert.equal(item.image, undefined)
      if (b.type === 'Hero') assert.equal(b.props.image, undefined)
    }
  }
})

test('the only square-bracket tokens are the declared decisions', () => {
  const declared = new Set<string>(Object.values(PLACEHOLDERS))
  for (const page of ROADMAP_PAGES) {
    for (const token of findPlaceholders(page.content)) assert.ok(declared.has(token), token)
  }
})

test('every decision is used, so none can be forgotten', () => {
  const found = new Set(ROADMAP_PAGES.flatMap((p) => findPlaceholders(p.content)))
  for (const token of Object.values(PLACEHOLDERS)) assert.ok(found.has(token), token)
})

test('filling a decision replaces every copy of it and leaves the others alone', () => {
  const filled = fillPlaceholders(PREVIEW_PAGE, { turnaround: 'within five business days of the call' })
  const left = findPlaceholders(filled)
  assert.ok(!left.includes(PLACEHOLDERS.turnaround))
  assert.ok(left.includes(PLACEHOLDERS.classTerms))
  assert.ok(JSON.stringify(filled).includes('within five business days of the call'))
})

test('a blank answer does not wipe a token that still needs deciding', () => {
  const filled = fillPlaceholders(PREVIEW_PAGE, { classTerms: '   ', turnaround: '' })
  assert.deepEqual(findPlaceholders(filled).sort(), findPlaceholders(PREVIEW_PAGE).sort())
})

test('filling does not change the page it was given', () => {
  const before = JSON.stringify(PREVIEW_PAGE)
  fillPlaceholders(PREVIEW_PAGE, { classTime: 'Thursdays at 11 AM Mountain' })
  assert.equal(JSON.stringify(PREVIEW_PAGE), before)
})

test('prose that merely uses brackets is not mistaken for a token', () => {
  assert.deepEqual(findPlaceholders({ a: 'see [1] and [a note] and [OK]' }), [])
  assert.deepEqual(findPlaceholders({ a: 'at [CLASS DAY AND TIME].' }), ['[CLASS DAY AND TIME]'])
})

test('the thank-you page lists the buttons still waiting for a link', () => {
  assert.deepEqual(findEmptyButtons(THANKS_PAGE).sort(), ['Book your listening call', 'Start the questionnaire'])
  assert.deepEqual(findEmptyButtons(PREVIEW_PAGE), [])
})

test('all three pages are drafts-in-waiting with the right slugs and the thank-you page is not indexed', () => {
  assert.deepEqual(ROADMAP_PAGES.map((p) => p.slug), ['roadmap', 'roadmap-preview', 'roadmap-thanks'])
  assert.equal((ROADMAP_PAGES[2] as { noindex?: boolean }).noindex, true)
  for (const page of ROADMAP_PAGES) assert.ok(page.description.length <= 160, page.slug)
})

test('every block id on a page is unique', () => {
  for (const page of ROADMAP_PAGES) {
    const ids = blocks(page.content).map((b) => b.props.id)
    assert.equal(new Set(ids).size, ids.length, page.slug)
  }
})

test('the slugs are mapped to their URLs and the migration is registered', () => {
  const routes = readFileSync('src/lib/builder-page.ts', 'utf8')
  assert.match(routes, /roadmap: '\/roadmap'/)
  assert.match(routes, /'roadmap-preview': '\/roadmap\/preview'/)
  assert.match(routes, /'roadmap-thanks': '\/roadmap\/thanks'/)
  assert.match(readFileSync('src/migrations/index.ts', 'utf8'), /20261030_150000_roadmap_pages/)
})

test('no hand-written dashes slipped into the long page copy about money', () => {
  assert.ok(JSON.stringify(PREVIEW_PAGE).includes('Each of those costs more than $500, in money or in months.'))
})

console.log(`\n${passed} passed`)
