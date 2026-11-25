import type { Metadata } from 'next'
import Link from 'next/link'

import { memberOrNot } from '../community/guard'
import { AppBar } from '@/components/AppBar'
import { isModerator } from '@/lib/community'
import { formatDay, listReplays, replayPath } from '@/lib/replays'

export const metadata: Metadata = {
  title: 'Replays',
  robots: { index: false, follow: false },
}

/**
 * Every recorded call, newest first.
 *
 * Same gate as the community, and the same rule that matters most: a non-member
 * gets the door and not the room, and the locked state renders **before any
 * query**, so there is nothing to leak even by accident, not a title, not a count.
 */
export default async function ReplaysPage() {
  const { user, isMember } = await memberOrNot('/replays')

  if (!isMember) {
    return (
      <>
        <AppBar user={user} current="replays" />
        <main className="shell threadwrap">
          <div className="pagehead">
            <h1>Replays</h1>
            <p>Recordings of the weekly calls, for eCommHarvest Weekly members.</p>
          </div>
          <div className="empty">
            <strong>Your membership is not active</strong>
            If you have just joined and this is still here, email{' '}
            <a href="mailto:hello@ecommharvest.com" className="plainlink">
              hello@ecommharvest.com
            </a>{' '}
            and we will sort it out.
          </div>
        </main>
      </>
    )
  }

  const moderator = isModerator(user)
  const replays = await listReplays({ moderator })

  return (
    <>
      <AppBar user={user} current="replays" community />
      <main className="shell threadwrap">
        <div className="pagehead">
          <h1>Replays</h1>
          <p>Every weekly call, with what was covered and the files that go with it.</p>
        </div>

        {replays.length === 0 ? (
          <div className="empty">
            <strong>No replays yet</strong>
            The first one appears here after the next call.
          </div>
        ) : (
          <div className="threads">
            {replays.map((replay) => (
              <Link key={replay.id} href={replayPath(replay.slug)} className="thread">
                <div className="thread-top">
                  <h2>{replay.title}</h2>
                  {!replay.published && <span className="tag tag-locked">Draft</span>}
                </div>
                {replay.summary ? <p className="thread-excerpt">{replay.summary}</p> : null}
                <p className="thread-meta">
                  {replay.recordedAt ? <span>{formatDay(replay.recordedAt)}</span> : null}
                  {replay.hasVideo ? <span>Video</span> : null}
                  {replay.downloads > 0 ? (
                    <span>
                      {replay.downloads} {replay.downloads === 1 ? 'download' : 'downloads'}
                    </span>
                  ) : null}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
