/**
 * Cancelling is not removing.
 *
 *   npx tsx test/membership.test.ts
 *
 * The whole two-date design rests on one distinction, and it is the kind that
 * erodes quietly: somebody adds a "remove member" button, wires it to the
 * nearest function, and from then on everybody who cancels loses the room the
 * same afternoon — having paid for the month. Nothing throws, nothing logs, and
 * the first anyone hears is a refund request.
 *
 * So these check the rule itself rather than the buttons:
 *
 *   - `revokedAt` set    → out now, whatever the dates say.
 *   - `expiresAt` future → still in. This is a cancellation.
 *   - `expiresAt` past   → out, on its own, with nobody having to do anything.
 *
 * That last one is also why a missed payment webhook is survivable: access
 * lapses by itself instead of persisting until somebody notices.
 */
import assert from 'node:assert/strict'

import {
  WEEKLY,
  isLive,
  liveEntitlement,
  liveMembershipWhere,
  membershipState,
} from '@/lib/membership'

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

const NOW = Date.parse('2026-10-01T12:00:00Z')
const days = (n: number) => new Date(NOW + n * 86_400_000).toISOString()

test('an open-ended grant is live', () => {
  assert.equal(isLive({}, NOW), true)
  assert.equal(isLive({ expiresAt: null, revokedAt: null }, NOW), true)
  assert.equal(membershipState({ expiresAt: null, revokedAt: null }, NOW), 'active')
})

test('a cancellation keeps them in until the date they paid through', () => {
  // The case the whole design exists for: cancelled on the 1st, paid to the
  // 28th. Taking the room away today is charging for twenty-seven days of
  // nothing.
  const cancelled = { expiresAt: days(27), revokedAt: null }
  assert.equal(isLive(cancelled, NOW), true)
  assert.equal(membershipState(cancelled, NOW), 'ending')
})

test('and stops letting them in once that date passes, with nobody doing anything', () => {
  const lapsed = { expiresAt: days(-1), revokedAt: null }
  assert.equal(isLive(lapsed, NOW), false)
  assert.equal(membershipState(lapsed, NOW), 'expired')
})

test('a revoke is immediate, and outranks a future expiry', () => {
  // A refund on the 1st of a month paid to the 28th must not leave them in the
  // room because the period has not ended. Revocation wins.
  const refunded = { expiresAt: days(27), revokedAt: days(0) }
  assert.equal(isLive(refunded, NOW), false)
  assert.equal(membershipState(refunded, NOW), 'revoked')
})

test('no row at all is not a membership', () => {
  assert.equal(membershipState(null, NOW), 'none')
  assert.equal(membershipState(undefined, NOW), 'none')
})

test('an unreadable date does not quietly lock a paying member out', () => {
  // Garbage in `expiresAt` should not be read as "expired". Somebody who has
  // paid losing access because of a malformed date is the worse failure of the
  // two, and a live row with a bad date is visible in the admin.
  const odd = { expiresAt: 'not a date', revokedAt: null }
  assert.equal(isLive(odd, NOW), true)
  assert.equal(membershipState(odd, NOW), 'active')
})

test('the query asks for exactly what the in-memory rule asks for', () => {
  /**
   * The two have to agree. `isLive` decides what the members screen shows and
   * the query decides who actually gets in, so a drift between them is a screen
   * that says "Member" beside somebody the room turns away.
   */
  const where = liveMembershipWhere(7, WEEKLY, '2026-10-01T12:00:00.000Z')
  const parts = JSON.stringify(where.and)
  assert.match(parts, /"user":\{"equals":7\}/)
  assert.match(parts, /"product":\{"equals":"weekly"\}/)
  assert.match(parts, /"revokedAt":\{"exists":false\}/)
  assert.match(parts, /"expiresAt":\{"greater_than":"2026-10-01T12:00:00.000Z"\}/)
  // Blank expiry must still count as live, or every open-ended grant vanishes.
  assert.match(parts, /"expiresAt":\{"exists":false\}/)
})

test('the course rule and the membership rule share one definition of live', () => {
  // `hasCourseAccess` and `hasMembership` both spread this. If it ever stopped
  // being shared, a revoked course would behave differently from a revoked
  // membership for no reason anybody chose.
  const shared = JSON.stringify(liveEntitlement('2026-10-01T12:00:00.000Z'))
  assert.ok(JSON.stringify(liveMembershipWhere(1, WEEKLY, '2026-10-01T12:00:00.000Z')).includes(
    shared.slice(1, -1),
  ))
})

console.log(`\n${passed} passed`)
