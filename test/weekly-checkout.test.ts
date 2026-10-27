/**
 * Putting the payment link into the Weekly pages without undoing anybody's work.
 *
 *   npx tsx test/weekly-checkout.test.ts
 *
 * The migration that wires the Join button runs on the *live* database, where the
 * pages have been edited since they were seeded. The failure worth preventing is
 * not a missing link — it is a deploy that silently replaces a link somebody
 * pasted into the builder that morning.
 */
import assert from 'node:assert/strict'

import { WEEKLY_PAGES } from '@/seed/weekly-pages'
import { withCheckoutUrl, withoutCheckoutUrl } from '@/lib/weekly-checkout'
import { WEEKLY_CHECKOUT_URL } from '@/lib/weekly'

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

const URL_A = 'https://pay.example/a'
const URL_B = 'https://pay.example/b'
const card = (checkoutUrl?: string) => ({ type: 'PricingCard', props: { id: 'p', checkoutUrl } })
const page = (...blocks: unknown[]) => ({ root: {}, content: blocks })

test('an empty pricing block gets the link', () => {
  const result = withCheckoutUrl(page({ type: 'Hero', props: {} }, card('')), URL_A)
  assert.equal(result.found, 1)
  assert.equal(result.filled, 1)
  assert.equal((result.content.content![1] as any).props.checkoutUrl, URL_A)
})

test('a missing field counts as empty, and so does whitespace', () => {
  for (const empty of [undefined, '', '   ', '\n']) {
    const result = withCheckoutUrl(page(card(empty as string)), URL_A)
    assert.equal(result.filled, 1, JSON.stringify(empty))
  }
})

test('a link somebody already pasted is never overwritten', () => {
  const result = withCheckoutUrl(page(card(URL_B)), URL_A)
  assert.equal(result.filled, 0)
  assert.equal(result.kept, 1)
  assert.equal((result.content.content![0] as any).props.checkoutUrl, URL_B)
})

test('with two pricing blocks it fills one and keeps the other', () => {
  const result = withCheckoutUrl(page(card(URL_B), card('')), URL_A)
  assert.deepEqual([result.found, result.filled, result.kept], [2, 1, 1])
  assert.equal((result.content.content![0] as any).props.checkoutUrl, URL_B)
  assert.equal((result.content.content![1] as any).props.checkoutUrl, URL_A)
})

test('it changes only the checkout URL and nothing else in the block', () => {
  const before = { type: 'PricingCard', props: { id: 'p', price: '$100', ctaLabel: 'Join', checkoutUrl: '' } }
  const result = withCheckoutUrl(page(before), URL_A)
  const after = (result.content.content![0] as any).props
  assert.equal(after.price, '$100')
  assert.equal(after.ctaLabel, 'Join')
  assert.equal(after.id, 'p')
})

test('other blocks and page settings pass through untouched', () => {
  const hero = { type: 'Hero', props: { heading: 'Hello', checkoutUrl: '' } }
  const input = { root: { props: { title: 'x' } }, content: [hero, card('')], zones: { a: 1 } }
  const result = withCheckoutUrl(input, URL_A)
  assert.deepEqual(result.content.content![0], hero)
  assert.deepEqual((result.content as any).root, input.root)
  assert.deepEqual((result.content as any).zones, input.zones)
})

test('the input is not mutated', () => {
  const input = page(card(''))
  const snapshot = JSON.stringify(input)
  withCheckoutUrl(input, URL_A)
  assert.equal(JSON.stringify(input), snapshot)
})

test('a page with no pricing block reports it instead of pretending', () => {
  const result = withCheckoutUrl(page({ type: 'Hero', props: {} }), URL_A)
  assert.equal(result.found, 0)
  assert.equal(result.filled, 0)
})

test('malformed content does not throw', () => {
  for (const bad of [null, undefined, 'text', 42, {}, { content: 'no' }, { content: [null, 3] }]) {
    assert.doesNotThrow(() => withCheckoutUrl(bad, URL_A), JSON.stringify(bad))
  }
})

test('undo clears only the link this change wrote', () => {
  const written = withCheckoutUrl(page(card(''), card(URL_B)), URL_A).content
  const undone = withoutCheckoutUrl(written, URL_A)
  assert.equal((undone.content![0] as any).props.checkoutUrl, '')
  // The one somebody chose is theirs, and survives a rollback.
  assert.equal((undone.content![1] as any).props.checkoutUrl, URL_B)
})

test('the payment link is a real https URL', () => {
  assert.match(WEEKLY_CHECKOUT_URL, /^https:\/\/[a-z0-9.-]+\/payment-link\/[a-z0-9]+$/i)
})

test('a freshly seeded Weekly page carries the link, so a new database is not a dead button', () => {
  for (const seeded of WEEKLY_PAGES) {
    const cards = (seeded.content.content as any[]).filter((b) => b.type === 'PricingCard')
    assert.ok(cards.length >= 1, `${seeded.slug} has no pricing block`)
    for (const c of cards) assert.equal(c.props.checkoutUrl, WEEKLY_CHECKOUT_URL, seeded.slug)
  }
})

console.log(`\n${passed} passed`)
