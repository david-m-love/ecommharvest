/**
 * What a member's post shows about them, and what it must never show.
 *
 *   npx tsx test/community-text.test.ts
 *
 * The community is a room where founders put real revenue numbers in front of
 * people who sell what they sell. The thing that must not leak out of it is the
 * one piece of contact information the app holds on everybody: their email
 * address.
 *
 * It would leak by accident, not by attack. `Users.access.read` stops a member
 * reading another member's row, so the read layer fetches authors with
 * `overrideAccess` — and the moment it does, every column is in hand and only a
 * `select` and this function stand between the address and the page. So the
 * rule is asserted here rather than left to be noticed in review.
 */
import assert from 'node:assert/strict'

import {
  FALLBACK_BYLINE,
  bylineOf,
  excerptOf,
  formatWhen,
  paragraphsOf,
} from '@/lib/community-text'

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

test('a chosen name wins over everything else', () => {
  assert.equal(
    bylineOf({ displayName: 'Mitch', name: 'Mitchell Adams', email: 'mitch@socks.com' }),
    'Mitch',
  )
  assert.equal(bylineOf({ name: 'Mitchell Adams', email: 'mitch@socks.com' }), 'Mitchell Adams')
})

test('an email address is never used as a byline', () => {
  /**
   * The assertion that matters. Every shape a half-filled account can be in,
   * and in none of them does an "@" reach the page.
   */
  const shapes = [
    { email: 'mitch@socks.com' },
    { displayName: '', name: '', email: 'mitch@socks.com' },
    { displayName: '   ', name: null, email: 'mitch@socks.com' },
    { displayName: null, name: undefined, email: 'MITCH@SOCKS.COM' },
  ]
  for (const shape of shapes) {
    const byline = bylineOf(shape)
    assert.ok(!byline.includes('@'), `"${byline}" contains an address`)
    assert.ok(!/socks\.com/i.test(byline), `"${byline}" contains a domain`)
  }
})

test('the local part is the fallback, and only the local part', () => {
  assert.equal(bylineOf({ email: 'mitch@socks.com' }), 'mitch')
})

test('somebody with nothing filled in is still called something', () => {
  // A blank byline would render as a gap where a name should be, which reads as
  // a broken page rather than as a private one.
  assert.equal(bylineOf({}), FALLBACK_BYLINE)
  assert.equal(bylineOf(null), FALLBACK_BYLINE)
  assert.equal(bylineOf({ email: '   ' }), FALLBACK_BYLINE)
})

test('an excerpt is one line and does not run off the card', () => {
  assert.equal(excerptOf('one\n\ntwo   three'), 'one two three')
  const long = excerptOf('x'.repeat(400))
  assert.ok(long.length <= 180, String(long.length))
  assert.ok(long.endsWith('…'))
  // Short posts are not decorated with an ellipsis they did not earn.
  assert.equal(excerptOf('Short one.'), 'Short one.')
})

test('blank lines become paragraphs, and nothing else does', () => {
  assert.deepEqual(paragraphsOf('one\n\ntwo'), ['one', 'two'])
  // A single newline is not a paragraph break — it is somebody wrapping a line.
  assert.deepEqual(paragraphsOf('one\ntwo'), ['one\ntwo'])
  assert.deepEqual(paragraphsOf(''), [])
  assert.deepEqual(paragraphsOf('\n\n \n\n'), [])
})

test('markup in a post stays text', () => {
  /**
   * Not an escaping test — React escapes. This asserts the shape that makes
   * escaping sufficient: the body is handed to the page as strings, so there is
   * no path on which a `<script>` in a post becomes an element.
   */
  const [para] = paragraphsOf('<script>alert(1)</script>')
  assert.equal(typeof para, 'string')
  assert.equal(para, '<script>alert(1)</script>')
})

test('dates are formatted in UTC, identically on the server and in the browser', () => {
  // A floating timezone here means React logs a hydration mismatch and two
  // members see two different days on the same reply.
  // "Sept", not "Sep": that is what en-GB abbreviates September to. Asserted
  // as the literal it actually produces, so a change of locale or of the fixed
  // UTC timezone shows up here rather than on somebody's screen.
  assert.equal(formatWhen('2026-09-24T17:00:00.000Z'), '24 Sept 2026, 17:00')
  assert.equal(formatWhen('2026-10-01T09:05:00.000Z'), '1 Oct 2026, 09:05')
  assert.equal(formatWhen(null), '')
  assert.equal(formatWhen('not a date'), '')
})

console.log(`\n${passed} passed`)
