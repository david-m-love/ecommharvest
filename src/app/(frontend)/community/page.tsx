import type { Metadata } from 'next'
import Link from 'next/link'

import { CallPanel } from './CallPanel'
import { memberOrNot } from './guard'
import { AppBar } from '@/components/AppBar'
import { COMMUNITY_PATH, formatWhen, listThreads, threadPath } from '@/lib/community'
import { getSiteStyles } from '@/lib/site-styles'

export const metadata: Metadata = {
  title: 'Community',
  robots: { index: false, follow: false },
}

/**
 * The feed.
 *
 * Pinned first, then by last activity — an answer landing on a three-week-old
 * question is the most interesting thing that happened today, and a room sorted
 * by when things were asked buries it.
 */
export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; error?: string }>
}) {
  const { user, isMember } = await memberOrNot(COMMUNITY_PATH)
  const { page, error } = await searchParams
  const current = Math.max(1, Number(page) || 1)

  /**
   * A non-member is shown the door, not the room — and crucially, no thread is
   * read at all. The locked state renders before any query, so there is nothing
   * to leak even by accident: no titles, no names, no counts.
   */
  if (!isMember) {
    return (
      <>
        <AppBar user={user} current="community" />
        <main className="shell threadwrap">
          <div className="pagehead">
            <h1>Community</h1>
            <p>A private room for eCommHarvest Weekly members.</p>
          </div>
          <div className="empty">
            <strong>Your membership is not active</strong>
            Members ask what they are actually working through, and get an answer from David or
            from somebody a quarter ahead of them. If you have just joined and this is still
            here, email{' '}
            <a href="mailto:hello@ecommharvest.com" className="plainlink">
              hello@ecommharvest.com
            </a>{' '}
            and we will sort it out.
          </div>
        </main>
      </>
    )
  }

  const [{ threads, totalPages, total }, styles] = await Promise.all([
    listThreads({ page: current }),
    getSiteStyles(),
  ])

  return (
    <>
      <AppBar user={user} current="community" community />
      <main className="shell threadwrap">
        <div className="pagehead">
          <h1>Community</h1>
          <p>
            Ask what you are actually working through. Answers stay here, and stay searchable.
          </p>
        </div>

        {error && <p className="notice">{error}</p>}

        <CallPanel styles={styles} />

        <div className="memsearch">
          <Link href={`${COMMUNITY_PATH}/new`} className="btn">
            Ask a question
          </Link>
          <Link href={`${COMMUNITY_PATH}/profile`} className="btn btn-ghost">
            How your name appears
          </Link>
        </div>

        {threads.length === 0 ? (
          <div className="empty">
            <strong>Nothing here yet</strong>
            Be the first to ask. A half-formed question with real numbers in it beats a tidy one.
          </div>
        ) : (
          <>
            <div className="threads">
              {threads.map((thread) => (
                <Link key={thread.id} href={threadPath(thread.slug)} className="thread">
                  <div className="thread-top">
                    <h2>{thread.title}</h2>
                    {thread.pinned && <span className="tag">Pinned</span>}
                    {thread.locked && <span className="tag tag-locked">Closed</span>}
                  </div>
                  <p className="thread-excerpt">{thread.excerpt}</p>
                  <p className="thread-meta">
                    <span>
                      <b>{thread.author}</b>
                    </span>
                    <span>
                      {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
                    </span>
                    <span>{formatWhen(thread.lastActivity)}</span>
                  </p>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="memsearch" style={{ marginTop: 26 }}>
                {current > 1 && (
                  <Link href={`${COMMUNITY_PATH}?page=${current - 1}`} className="btn btn-ghost">
                    ← Newer
                  </Link>
                )}
                {current < totalPages && (
                  <Link href={`${COMMUNITY_PATH}?page=${current + 1}`} className="btn btn-ghost">
                    Older →
                  </Link>
                )}
                <span className="cellsub">
                  Page {current} of {totalPages} · {total} questions
                </span>
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}
