import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { AppBar } from '@/components/AppBar'
import { requireAdmin } from '@/lib/auth'
import { payload } from '@/lib/entitlements'
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

  // Live entitlements keyed "userId:courseId".
  const live = new Set(
    entitlements.docs
      .filter(
        (e) =>
          !e.revokedAt && (!e.expiresAt || new Date(e.expiresAt).getTime() > now),
      )
      .map((e) => `${idOf(e.user)}:${idOf(e.course)}`),
  )
  const completedByUser = new Map<string, number>()
  for (const row of progress.docs) {
    const key = idOf(row.user)
    completedByUser.set(key, (completedByUser.get(key) || 0) + 1)
  }

  return (
    <>
      <AppBar user={admin} />
      <main className="shell">
        <div className="pagehead">
          <h1>Members</h1>
          <p>
            {users.totalDocs} {users.totalDocs === 1 ? 'person' : 'people'} · grant or revoke access
            in one click. Every change is written to the audit log.
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
