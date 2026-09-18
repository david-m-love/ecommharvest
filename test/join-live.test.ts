/**
 * Whether the "join live" link goes on the page.
 *
 *   npx tsx test/join-live.test.ts
 *
 * This runs once, on one morning, and either works or registrants cannot find
 * the room. There is no rehearsal for that.
 *
 * It used to be decided by the clock — two instants in `src/lib/event.ts` — and
 * these tests used to prove the timezone arithmetic. The rule is now a switch in
 * Site Styles, which is a smaller thing to get wrong but not a free one: the
 * combination that matters is a switch turned on before a link has been pasted,
 * which would render a dead "join the live masterclass" at exactly the moment
 * somebody is trying to use it.
 */
import assert from 'node:assert/strict'

import { JOIN_LIVE_DEFAULT_LABEL, joinLive } from '@/lib/join-live'

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

const ZOOM = 'https://us02web.zoom.us/j/12345678901'
const styles = (over: Partial<Parameters<typeof joinLive>[0]> = {}) => ({
  showJoinLive: false,
  liveJoinUrl: null,
  joinLiveLabel: null,
  ...over,
})

test('off by default — nothing before anybody touches the switch', () => {
  assert.equal(joinLive(styles()), null)
})

test('off, even with the link already pasted', () => {
  /**
   * The point of pasting early. The URL sits in the admin for days and reaches
   * no page, so there is no reason to leave it until the morning.
   */
  assert.equal(joinLive(styles({ liveJoinUrl: ZOOM })), null)
})

test('on, with a link — the link and the default wording', () => {
  assert.deepEqual(joinLive(styles({ showJoinLive: true, liveJoinUrl: ZOOM })), {
    joinUrl: ZOOM,
    joinLabel: JOIN_LIVE_DEFAULT_LABEL,
  })
})

test('on with no link shows nothing rather than a dead link', () => {
  // The dangerous combination: ticked in advance, link pasted later or never.
  // A link that goes nowhere is worse than no link — whoever clicks it stops
  // looking, at the one moment they cannot afford to.
  assert.equal(joinLive(styles({ showJoinLive: true })), null)
  assert.equal(joinLive(styles({ showJoinLive: true, liveJoinUrl: '' })), null)
})

test('custom wording wins when it is set', () => {
  const result = joinLive(
    styles({ showJoinLive: true, liveJoinUrl: ZOOM, joinLiveLabel: 'We have started — join us →' }),
  )
  assert.equal(result?.joinLabel, 'We have started — join us →')
})

test('blank wording falls back rather than rendering an empty link', () => {
  // A whitespace-only label is read as "unset" before it reaches here, but an
  // empty string must not produce an anchor with nothing to click.
  assert.equal(
    joinLive(styles({ showJoinLive: true, liveJoinUrl: ZOOM, joinLiveLabel: '' }))?.joinLabel,
    JOIN_LIVE_DEFAULT_LABEL,
  )
})

test('the default wording says who it is for', () => {
  // "Already registered?" is what keeps this from reading as a way past the
  // form. Without it the link is a second call to action competing with Save my
  // seat, which is the thing the whole treatment exists to avoid.
  assert.match(JOIN_LIVE_DEFAULT_LABEL, /already registered/i)
})

console.log(`\n${passed} passed`)
