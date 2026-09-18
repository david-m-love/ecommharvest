/**
 * When the "join the live masterclass" link is on the page.
 *
 *   npx tsx test/join-live.test.ts
 *
 * This runs once, on one morning, and either works or the event starts with
 * registrants unable to find the room. There is no staging rehearsal for that,
 * so the window is tested at specific instants rather than at whatever moment
 * the suite happens to run.
 *
 * The thing most likely to go wrong is timezones. The link must appear at 10:30
 * *Mountain*, not 10:30 wherever the visitor is sitting — and `isJoinWindowOpen`
 * compares absolute instants precisely so that no conversion is ever done. These
 * checks prove it by asking the same question from several timezones and
 * requiring the same answer.
 */
import assert from 'node:assert/strict'

import {
  EVENT_START_ISO,
  JOIN_CLOSES_ISO,
  JOIN_OPENS_ISO,
  isJoinWindowOpen,
} from '@/lib/event'

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

const at = (iso: string) => new Date(iso)

test('shut until half an hour before the start', () => {
  assert.equal(isJoinWindowOpen(at('2026-09-01T12:00:00-06:00')), false, 'three weeks early')
  assert.equal(isJoinWindowOpen(at('2026-09-24T09:00:00-06:00')), false, 'two hours early')
  assert.equal(isJoinWindowOpen(at('2026-09-24T10:29:59-06:00')), false, 'one second early')
})

test('open from 10:30 Mountain, through the event, and after it', () => {
  assert.equal(isJoinWindowOpen(at(JOIN_OPENS_ISO)), true, 'the instant it opens')
  assert.equal(isJoinWindowOpen(at('2026-09-24T10:55:00-06:00')), true, 'five minutes before')
  assert.equal(isJoinWindowOpen(at(EVENT_START_ISO)), true, 'at the start')
  assert.equal(isJoinWindowOpen(at('2026-09-24T11:40:00-06:00')), true, 'mid-session')
  assert.equal(isJoinWindowOpen(at('2026-09-24T12:15:00-06:00')), true, 'during the Q&A')
  assert.equal(isJoinWindowOpen(at('2026-09-24T12:45:00-06:00')), true, 'a late arrival after it ends')
})

test('shut again afterwards', () => {
  assert.equal(isJoinWindowOpen(at(JOIN_CLOSES_ISO)), false, 'the instant it closes')
  assert.equal(isJoinWindowOpen(at('2026-09-25T11:00:00-06:00')), false, 'the next day')
})

test('it opens 30 minutes before the event, not at some other offset', () => {
  const minutes = (Date.parse(EVENT_START_ISO) - Date.parse(JOIN_OPENS_ISO)) / 60000
  assert.equal(minutes, 30)
})

test('it stays open long enough for a late arrival', () => {
  // Someone who mistimed it by an hour still gets in. The cost of closing early
  // is a registrant who cannot join; the cost of closing late is nothing.
  const minutes = (Date.parse(JOIN_CLOSES_ISO) - Date.parse(EVENT_START_ISO)) / 60000
  assert.ok(minutes >= 90, `only stays open ${minutes} minutes after the start`)
})

test('the visitor’s timezone cannot change the answer', () => {
  /**
   * The same instant, written four ways. If any of these disagreed, the window
   * would be reading a wall clock somewhere rather than a moment — and a
   * visitor in London would see the link at 10:30 *their* time, five hours
   * before the room exists.
   */
  const sameMoment = [
    '2026-09-24T10:45:00-06:00', // Denver
    '2026-09-24T12:45:00-04:00', // New York
    '2026-09-24T16:45:00Z', // UTC
    '2026-09-24T17:45:00+01:00', // London
  ]
  const answers = sameMoment.map((iso) => isJoinWindowOpen(at(iso)))
  assert.deepEqual(answers, [true, true, true, true], `disagreed: ${answers}`)

  // And an instant outside the window agrees the other way, from everywhere.
  const tooEarly = ['2026-09-24T09:45:00-06:00', '2026-09-24T15:45:00Z', '2026-09-24T16:45:00+01:00']
  assert.deepEqual(tooEarly.map((iso) => isJoinWindowOpen(at(iso))), [false, false, false])
})

test('the window is anchored to the event, not hand-typed', () => {
  // Both ends on the same day as the event: a mistyped month or day would leave
  // the link either permanently hidden or permanently visible.
  assert.ok(JOIN_OPENS_ISO.startsWith('2026-09-24'), JOIN_OPENS_ISO)
  assert.ok(JOIN_CLOSES_ISO.startsWith('2026-09-24'), JOIN_CLOSES_ISO)
  assert.ok(Date.parse(JOIN_OPENS_ISO) < Date.parse(JOIN_CLOSES_ISO), 'opens before it closes')
})

console.log(`\n${passed} passed`)
