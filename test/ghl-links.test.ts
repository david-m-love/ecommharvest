/**
 * Where a leftover GoHighLevel link gets sent.
 *
 *   npx tsx test/ghl-links.test.ts
 *
 * The funnel moved off go.ecommharvest.com, and the first cleanup matched two
 * exact strings — so it missed every link written any other way. The commonest
 * other way was the one the builder suggested: its Button link placeholder read
 * `go.ecommharvest.com/register`, with no `https://`. People type what the box
 * shows them.
 *
 * This is the rule that catches the rest. It runs inside a migration against
 * live page content and the site menu, which is exactly the kind of code that
 * should not be tested for the first time on a deploy, a week before an event.
 */
import assert from 'node:assert/strict'

import { retarget, sweep } from '@/migrations/20260917_210000_no_links_left_on_ghl'
import { REGISTER_URL } from '@/lib/event'

const LANDING = 'https://ecommharvest.com/masterclass'
const THANKS = 'https://ecommharvest.com/masterclass/thanks'

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

test('the shape the builder’s own placeholder taught people to type', () => {
  // No scheme. This is the one the first cleanup could not see.
  assert.equal(retarget('go.ecommharvest.com/register'), REGISTER_URL)
})

test('every other way the same address gets written', () => {
  for (const value of [
    'https://go.ecommharvest.com/register',
    'http://go.ecommharvest.com/register',
    'https://www.go.ecommharvest.com/register',
    'https://go.ecommharvest.com/register/',
    'https://go.ecommharvest.com/register?utm_source=email',
    'https://go.ecommharvest.com/register#form',
    'GO.ECOMMHARVEST.COM/REGISTER',
    '  https://go.ecommharvest.com/register  ',
  ]) {
    assert.equal(retarget(value), REGISTER_URL, value)
  }
})

test('the other funnel pages go to their own equivalents, not to the form', () => {
  assert.equal(retarget('https://go.ecommharvest.com/masterclass'), LANDING)
  assert.equal(retarget('go.ecommharvest.com/thanks'), THANKS)
  assert.equal(retarget('https://go.ecommharvest.com/thank-you'), THANKS)
  // The funnel root was the landing page — the page that does the persuading.
  assert.equal(retarget('https://go.ecommharvest.com'), LANDING)
  assert.equal(retarget('go.ecommharvest.com/'), LANDING)
})

test('a page with no equivalent here is left alone rather than guessed at', () => {
  /**
   * Reported in the log instead. Redirecting some unrelated GoHighLevel page to
   * the registration form would be a confident wrong answer, and a wrong link is
   * harder to notice than a missing one.
   */
  assert.equal(retarget('https://go.ecommharvest.com/affiliate-terms'), null)
  assert.equal(retarget('https://go.ecommharvest.com/survey/2027'), null)
})

test('links that are not the old funnel are not touched', () => {
  assert.equal(retarget('/masterclass/register'), null)
  assert.equal(retarget('https://ecommharvest.com/masterclass/register'), null)
  assert.equal(retarget('https://app.ecommharvest.com/admin'), null)
  assert.equal(retarget('mailto:hello@ecommharvest.com'), null)
  assert.equal(retarget(''), null)
})

test('a lookalike hostname is not the old funnel', () => {
  // Matching loosely here would rewrite somebody else's link on our own pages.
  assert.equal(retarget('https://go.ecommharvest.com.evil.test/register'), null)
  assert.equal(retarget('https://notgo.ecommharvest.com/register'), null)
  assert.equal(retarget('https://ecommharvest.com/go.ecommharvest.com/register'), null)
})

test('running the rule on its own output changes nothing', () => {
  // The migration can run on a database a previous deploy already cleaned.
  assert.equal(retarget(REGISTER_URL), null)
  assert.equal(retarget(LANDING), null)
  assert.equal(retarget(THANKS), null)
})

/**
 * A page shaped like a real one, because the rule is only half the job — the
 * other half is finding every place a link hides in stored block JSON: a button,
 * a footer link inside an array inside a prop, and prose that merely *mentions*
 * the address.
 */
const PAGE = {
  root: {},
  content: [
    { type: 'Header', props: { id: 'h', homeUrl: 'https://ecommharvest.com/' } },
    {
      type: 'Hero',
      props: {
        id: 'a',
        ctaHref: 'go.ecommharvest.com/register',
        body: 'Visit go.ecommharvest.com/register today',
      },
    },
    { type: 'CtaCard', props: { id: 'b', ctaHref: 'https://go.ecommharvest.com/register?utm=fb' } },
    {
      type: 'Footer',
      props: {
        id: 'f',
        links: [
          { label: 'Masterclass', href: 'https://go.ecommharvest.com/masterclass' },
          { label: 'Privacy', href: '/privacy' },
          { label: 'Odd one', href: 'https://go.ecommharvest.com/affiliate-terms' },
        ],
      },
    },
  ],
}

const run = (page: unknown) => {
  const found: { from: string; to: string | null }[] = []
  return { next: sweep(page, found) as typeof PAGE, found }
}

test('it finds links at every depth a block can bury them', () => {
  const { next } = run(PAGE)
  assert.equal(next.content[1].props.ctaHref, REGISTER_URL)
  assert.equal(next.content[2].props.ctaHref, REGISTER_URL)
  assert.equal(next.content[3].props.links?.[0].href, LANDING)
})

test('prose that mentions the address is not rewritten', () => {
  /**
   * A link is a whole value; this is a sentence with an address in it. Rewriting
   * it would edit somebody's copy on the strength of a substring match, and the
   * sentence would then read as a link that is not one.
   */
  const { next } = run(PAGE)
  assert.equal(next.content[1].props.body, 'Visit go.ecommharvest.com/register today')
})

test('everything else survives the walk untouched', () => {
  const { next } = run(PAGE)
  assert.equal(next.content.length, 4)
  assert.equal(next.content[0].props.homeUrl, 'https://ecommharvest.com/')
  assert.equal(next.content[3].props.links?.length, 3)
  assert.equal(next.content[3].props.links?.[1].href, '/privacy')
  // Reported, not guessed at — and therefore still present.
  assert.equal(next.content[3].props.links?.[2].href, 'https://go.ecommharvest.com/affiliate-terms')
})

test('it reports what it could not place, so nothing goes quiet', () => {
  const { found } = run(PAGE)
  const stranded = found.filter((link) => !link.to)
  assert.equal(stranded.length, 1)
  assert.match(stranded[0].from, /affiliate-terms/)
})

test('sweeping an already-swept page changes nothing', () => {
  const { next } = run(PAGE)
  const again = run(next)
  assert.equal(JSON.stringify(again.next), JSON.stringify(next))
})

console.log(`\n${passed} passed`)
