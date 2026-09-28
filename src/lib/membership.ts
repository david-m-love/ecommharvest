import type { Where } from 'payload'

/**
 * What "a live membership" means, as data rather than as a query typed out in
 * three places.
 *
 * Its own file, with no imports but a type, for the same reason `join-live.ts`
 * is: the collection access rules need it and so does the read layer, but the
 * read layer imports the Payload config and the collections *are* the Payload
 * config. Routing both through a module that imports nothing keeps the cycle
 * from existing, and leaves the rule testable without standing up a database.
 */

/** The subscriptions somebody can hold. One today. */
export type MembershipProduct = 'weekly'

export const WEEKLY: MembershipProduct = 'weekly'

/**
 * The two dates, and the difference between them.
 *
 *   - `revokedAt` set means somebody cut this off: a refund, a chargeback, a
 *     removal. Immediate, and deliberate.
 *   - `expiresAt` in the past means the paid period ran out.
 *
 * A **cancellation is only ever the second one.** Somebody who cancels three
 * days into a month they have paid for keeps the room until the end of it, so
 * cancelling moves `expiresAt` and never touches `revokedAt`. Keeping the two
 * apart is what lets a refund and a cancellation be told apart six months later
 * when somebody asks why they lost access.
 *
 * It also makes a missed renewal self-healing: access lapses on its own when
 * nothing moves the date forward, rather than persisting until a webhook that
 * never arrives is noticed.
 */
export const liveEntitlement = (now: string): Where[] => [
  { revokedAt: { exists: false } },
  { or: [{ expiresAt: { exists: false } }, { expiresAt: { greater_than: now } }] },
]

/** Everything that has to be true for this person to be in the room. */
export const liveMembershipWhere = (
  userId: string | number,
  product: MembershipProduct = WEEKLY,
  now: string = new Date().toISOString(),
): Where => ({
  and: [{ user: { equals: userId } }, { product: { equals: product } }, ...liveEntitlement(now)],
})

/**
 * Whether an entitlement row, already loaded, is live.
 *
 * The same rule as the query above, for the places that have the row in hand —
 * the members screen holds two thousand of them and must not ask the database
 * about each one.
 */
export const isLive = (
  row: { revokedAt?: string | null; expiresAt?: string | null },
  now: number = Date.now(),
): boolean => {
  if (row.revokedAt) return false
  if (!row.expiresAt) return true
  const ends = new Date(row.expiresAt).getTime()
  return Number.isNaN(ends) ? true : ends > now
}

/**
 * How a membership row reads to a human: live, ending on a date, or over.
 *
 * `ending` is the state the two-date design exists to express — cancelled, paid
 * up, still in the room. A screen that only knew "on" and "off" would have to
 * call that either a lie or a removal.
 */
export type MembershipState = 'none' | 'active' | 'ending' | 'expired' | 'revoked'

export const membershipState = (
  row: { revokedAt?: string | null; expiresAt?: string | null } | null | undefined,
  now: number = Date.now(),
): MembershipState => {
  if (!row) return 'none'
  if (row.revokedAt) return 'revoked'
  if (!row.expiresAt) return 'active'
  const ends = new Date(row.expiresAt).getTime()
  if (Number.isNaN(ends)) return 'active'
  return ends > now ? 'ending' : 'expired'
}
