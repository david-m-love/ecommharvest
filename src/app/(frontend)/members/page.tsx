import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { AppBar } from '@/components/AppBar'
import { requireAdmin } from '@/lib/auth'
import { payload } from '@/lib/entitlements'
import { type MembershipState, WEEKLY, isLive, membershipState } from '@/lib/membership'
import type { Course } from '@/payload-types'

/**
 * Admin members screen.
 *
 * Payload's own admin covers CRUD well but makes "who has access to what" a
 * multi-screen job. This is the one page that answers it and lets you change it
 * in a click — the screen a support question actually needs.
 *
 * Lives outside /admin (which Payload owns entirely) and is gated by
 * requireAdmin, so a member hitting it is redirected to /learn.
 */

export const metadata: Metadata = {
  title: 'Members',
  robots: { index: false, follow: false },
}

const fmtDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'


/** One button per action, posted as a form so the screen needs no JavaScript. */
const Action = ({
  userId,
  action,
  label,
  className = 'minibtn',
  title,
}: {
  userId: string
  action: string
  label: string
  className?: string
  title?: string
}) => (
  <form method="post" action="/api/admin/membership">
    <input type="hidden" name="userId" value={userId} />
    <input type="hidden" name="action" value={action} />
    <button type="submit" className={className} title={title}>
      {label}
    </button>
  </form>
)

/**
 * The weekly membership, and what can be done to it.
 *
 * The two ways a membership ends are two separate buttons, and the wording says
 * which is which. "Cancel" leaves them in the room until the date they have paid
 * through; "Remove now" does not. Collapsing them into one control is how a
 * cancellation quietly becomes a refund-shaped removal.
 */
const MembershipCell = ({
  userId,
  row,
}: {
  userId: string
  row?: { state: MembershipState; expiresAt?: string | null }
}) => {
  const state = row?.state || 'none'

  if (state === 'active') {
    return (
      <div className="cellstack">
        <span className="minibtn is-on" aria-hidden="true">
          ✓ Member
        </span>
        <Action
          userId={userId}
          action="cancel"
          label="Cancel"
          title="Ends at the end of the period they have paid for. They keep access until then."
        />
        <Action
          userId={userId}
          action="revoke"
          label="Remove now"
          className="minibtn minibtn-danger"
          title="Cuts access off immediately. For refunds, chargebacks and removals — not for cancellations."
        />
      </div>
    )
  }

  if (state === 'ending') {
    return (
      <div className="cellstack">
        <span className="cellsub">Ends {fmtDate(row?.expiresAt)}</span>
        <Action userId={userId} action="resume" label="Resume" title="Clears the end date." />
        <Action
          userId={userId}
          action="revoke"
          label="Remove now"
          className="minibtn minibtn-danger"
          title="Cuts access off immediately, before the paid period ends."
        />
      </div>
    )
  }

  // none, expired or revoked all offer the same next step.
  return (
    <div className="cellstack">
      <Action userId={userId} action="grant" label="Grant" />
      {state === 'revoked' && <span className="cellsub">Removed</span>}
      {state === 'expired' && <span className="cellsub">Lapsed {fmtDate(row?.expiresAt)}</span>}
    </div>
  )
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const admin = await requireAdmin()
  const { q } = await searchParams
  const p = await payload()

  const where: Where | undefined = q
    ? { or: [{ email: { like: q } }, { name: { like: q } }] }
    : undefined

  const [users, courses, entitlements, progress] = await Promise.all([
    p.find({
      collection: 'users',
      where,
      limit: 100,
      depth: 0,
      sort: '-createdAt',
      overrideAccess: true,
    }),
    p.find({ collection: 'courses', limit: 100, depth: 0, sort: 'createdAt', overrideAccess: true }),
    p.find({ collection: 'entitlements', limit: 2000, depth: 0, overrideAccess: true }),
    p.find({
      collection: 'progress',
      where: { completedAt: { exists: true } },
      limit: 5000,
      depth: 0,
      overrideAccess: true,
    }),
  ])

  const idOf = (v: unknown) => (v && typeof v === 'object' ? String((v as { id: unknown }).id) : String(v))
  const now = Date.now()

  // Live entitlements keyed "userId:courseId". Membership rows carry no course,
  // so they fall out of this set on their own and get their own column below.
  const live = new Set(
    entitlements.docs
      .filter((e) => e.course && isLive(e, now))
      .map((e) => `${idOf(e.user)}:${idOf(e.course)}`),
  )

  /**
   * The weekly membership per person, as a state rather than a boolean.
   *
   * Four states and not two, because "cancelled but paid up until the 28th" is
   * a real thing a member can be, and a screen that could only say on or off
   * would have to call that either active — and lose the fact that it is
   * ending — or removed, which it is not.
   */
  const membership = new Map<string, { state: MembershipState; expiresAt?: string | null }>()
  for (const row of entitlements.docs) {
    if (row.product !== WEEKLY) continue
    const key = idOf(row.user)
    // Newest row wins where somebody has a history of them.
    const existing = membership.get(key)
    if (existing && existing.state !== 'none') continue
    membership.set(key, { state: membershipState(row, now), expiresAt: row.expiresAt })
  }
  const completedByUser = new Map<string, number>()
  for (const row of progress.docs) {
    const key = idOf(row.user)
    completedByUser.set(key, (completedByUser.get(key) || 0) + 1)
  }

  return (
    <>
      <AppBar user={admin} community />
      <main className="shell">
        <div className="pagehead">
          <h1>Members</h1>
          <p>
            {users.totalDocs} {users.totalDocs === 1 ? 'person' : 'people'} · every change here is
            written to the audit log. <strong>Cancel</strong> ends a membership at the end of the
            period they have paid for and leaves them access until then;{' '}
            <strong>Remove now</strong> cuts it off immediately, for refunds and chargebacks.
          </p>
        </div>

        <form method="get" className="memsearch">
          <input
            type="search"
            name="q"
            defaultValue={q || ''}
            placeholder="Search name or email"
            aria-label="Search members"
          />
          <button type="submit" className="btn btn-ghost">
            Search
          </button>
          {q && (
            <Link href="/members" className="btn btn-ghost">
              Clear
            </Link>
          )}
          <Link href="/admin" className="btn btn-ghost">
            Payload admin →
          </Link>
        </form>

        {users.docs.length === 0 ? (
          <div className="empty">
            <strong>No members found</strong>
            {q ? `Nothing matched “${q}”.` : 'Members appear here once they sign in.'}
          </div>
        ) : (
          <div className="tablescroll">
            <table className="memtable">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Joined</th>
                  <th>Done</th>
                  <th>Weekly</th>
                  {courses.docs.map((c) => (
                    <th key={c.id}>{(c as Course).title}</th>
                  ))}
                  <th>Support</th>
                </tr>
              </thead>
              <tbody>
                {users.docs.map((user) => {
                  const uid = String(user.id)
                  const admins = user.roles?.includes('admin')
                  return (
                    <tr key={uid}>
                      <td>
                        <strong>{user.name || '—'}</strong>
                        <span className="cellsub">{user.email}</span>
                        {admins && <span className="rolepill">admin</span>}
                      </td>
                      <td className="cellsub">{fmtDate(user.createdAt)}</td>
                      <td className="cellsub">{completedByUser.get(uid) || 0}</td>
                      <td>
                        <MembershipCell
                          userId={uid}
                          row={membership.get(uid)}
                        />
                      </td>
                      {courses.docs.map((course) => {
                        const hasAccess = live.has(`${uid}:${String(course.id)}`)
                        return (
                          <td key={course.id}>
                            <form method="post" action="/api/admin/access">
                              <input type="hidden" name="userId" value={uid} />
                              <input type="hidden" name="courseId" value={String(course.id)} />
                              <input
                                type="hidden"
                                name="action"
                                value={hasAccess ? 'revoke' : 'grant'}
                              />
                              <button
                                type="submit"
                                className={hasAccess ? 'minibtn is-on' : 'minibtn'}
                                title={
                                  hasAccess
                                    ? 'Click to revoke access'
                                    : 'Click to grant access'
                                }
                              >
                                {hasAccess ? '✓ Enrolled' : 'Grant'}
                              </button>
                            </form>
                          </td>
                        )
                      })}
                      <td>
                        {!admins && (
                          <form method="post" action="/api/admin/impersonate">
                            <input type="hidden" name="userId" value={uid} />
                            <button
                              type="submit"
                              className="minibtn"
                              title="See the site exactly as this member sees it. You will need to sign back in afterwards."
                            >
                              View as
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}
