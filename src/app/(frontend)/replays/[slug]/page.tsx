import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { memberOrNot } from '../../community/guard'
import { AppBar } from '@/components/AppBar'
import { isModerator } from '@/lib/community'
import { RichText, richTextIsEmpty } from '@/lib/rich-text'
import { REPLAYS_PATH, formatDay, getReplay, replayPath } from '@/lib/replays'

export const metadata: Metadata = {
  title: 'Replay',
  robots: { index: false, follow: false },
}

/**
 * One replay, laid out like a lesson: the video, then what was covered, then the
 * files.
 *
 * A non-member is sent to the replays page, which explains, and never reaches
 * the query, so the title of a replay is not something a lapsed member can read
 * by being sent a link.
 */
export default async function ReplayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { user, isMember } = await memberOrNot(replayPath(slug))
  if (!isMember) redirect(REPLAYS_PATH)

  const found = await getReplay(slug, { moderator: isModerator(user) })
  if (!found) notFound()
  const { card, embed, notes, downloads, thread } = found

  return (
    <>
      <AppBar user={user} current="replays" community />
      <main className="shell threadwrap">
        <p className="thread-meta">
          <Link href={REPLAYS_PATH} className="plainlink">
            ← All replays
          </Link>
        </p>

        <div className="threadhead">
          <h1>{card.title}</h1>
          <div className="thread-top">
            {card.recordedAt ? <span className="tag">{formatDay(card.recordedAt)}</span> : null}
            {!card.published && <span className="tag tag-locked">Draft: only the team can see this</span>}
          </div>
        </div>

        {embed ? (
          <div className="replay">
            <iframe
              src={embed}
              title={`Replay: ${card.title}`}
              loading="lazy"
              allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : null}

        {card.summary ? <p className="replay-summary">{card.summary}</p> : null}

        {!richTextIsEmpty(notes) ? (
          <div className="prose lessonbody replay-notes">
            <RichText value={notes} />
          </div>
        ) : null}

        {downloads.length > 0 ? (
          <section className="replay-downloads">
            <h2>Downloads</h2>
            <ul className="attachlist">
              {downloads.map((file, i) => (
                <li key={i}>
                  <a href={file.url} download={file.filename || undefined}>
                    <span>{file.label}</span>
                    {file.size ? <span className="cellsub">{file.size}</span> : null}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {thread ? (
          <p className="replay-discuss">
            <Link href={`/community/${thread.slug}`} className="btn btn-ghost">
              Discuss this call in the community →
            </Link>
          </p>
        ) : null}
      </main>
    </>
  )
}
