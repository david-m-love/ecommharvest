import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { requireMember } from '../guard'
import { AppBar } from '@/components/AppBar'
import {
  COMMUNITY_PATH,
  formatWhen,
  getThread,
  isModerator,
  paragraphsOf,
  threadPath,
} from '@/lib/community'
import { MAX_BODY } from '@/lib/community-input'

export const metadata: Metadata = {
  title: 'Community',
  robots: { index: false, follow: false },
}

/** Plain text, rendered as paragraphs. Nothing in it is interpreted as markup. */
const Body = ({ text }: { text: string }) => (
  <div className="post-body">
    {paragraphsOf(text).map((para, i) => (
      <p key={i}>{para}</p>
    ))}
  </div>
)

/** The moderator's buttons. Plain form posts, so they work with no JavaScript. */
const ModBar = ({
  slug,
  pinned,
  locked,
  replyId,
}: {
  slug: string
  pinned?: boolean
  locked?: boolean
  replyId?: string
}) => (
  <div className="post-mod">
    {replyId ? (
      <form method="post" action="/api/community/moderate">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="replyId" value={replyId} />
        <input type="hidden" name="action" value="delete" />
        <button type="submit" className="minibtn minibtn-danger">
          Remove reply
        </button>
      </form>
    ) : (
      <>
        <form method="post" action="/api/community/moderate">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="action" value={pinned ? 'unpin' : 'pin'} />
          <button type="submit" className={pinned ? 'minibtn is-on' : 'minibtn'}>
            {pinned ? '✓ Pinned' : 'Pin'}
          </button>
        </form>
        <form method="post" action="/api/community/moderate">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="action" value={locked ? 'unlock' : 'lock'} />
          <button type="submit" className={locked ? 'minibtn is-on' : 'minibtn'}>
            {locked ? '✓ Closed' : 'Close thread'}
          </button>
        </form>
        <form method="post" action="/api/community/moderate">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="action" value="delete" />
          <button type="submit" className="minibtn minibtn-danger">
            Delete
          </button>
        </form>
      </>
    )}
  </div>
)

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { slug } = await params
  const user = await requireMember(threadPath(slug))
  const { error } = await searchParams

  const found = await getThread(slug)
  if (!found) notFound()

  const { thread, body, replies } = found
  const canModerate = isModerator(user)

  return (
    <>
      <AppBar user={user} current="community" community />
      <main className="shell threadwrap">
        <p className="thread-meta">
          <Link href={COMMUNITY_PATH} className="plainlink">
            ← All questions
          </Link>
        </p>

        <div className="threadhead">
          <h1>{thread.title}</h1>
          <div className="thread-top">
            {thread.pinned && <span className="tag">Pinned</span>}
            {thread.locked && <span className="tag tag-locked">Closed to new replies</span>}
          </div>
        </div>

        {error && <p className="notice">{error}</p>}

        <article className="post post-first">
          <p className="post-by">
            <b>{thread.author}</b>
            <span>{formatWhen(thread.createdAt)}</span>
          </p>
          <Body text={body} />
          {canModerate && (
            <ModBar slug={thread.slug} pinned={thread.pinned} locked={thread.locked} />
          )}
        </article>

        <p className="replyhead">
          {replies.length === 0
            ? 'No replies yet'
            : `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
        </p>

        {replies.map((reply, i) => (
          <article
            key={reply.id}
            className="post"
            // The reply box redirects here, so somebody who has just answered
            // lands on their own words rather than at the top of the page.
            id={i === replies.length - 1 ? 'latest' : undefined}
          >
            <p className="post-by">
              <b>{reply.author}</b>
              <span>{formatWhen(reply.createdAt)}</span>
            </p>
            <Body text={reply.body} />
            {canModerate && <ModBar slug={thread.slug} replyId={reply.id} />}
          </article>
        ))}

        {thread.locked ? (
          <p className="notice" style={{ marginTop: 26 }}>
            This thread is closed to new replies. It stays here to be read and found.
          </p>
        ) : (
          <form method="post" action="/api/community/replies" className="composer">
            <input type="hidden" name="slug" value={thread.slug} />
            <label htmlFor="reply">Your reply</label>
            <textarea
              id="reply"
              name="body"
              required
              maxLength={MAX_BODY}
              placeholder="What would you tell them if they asked you over coffee?"
            />
            <div className="composer-actions">
              <button type="submit" className="btn">
                Post reply
              </button>
            </div>
          </form>
        )}
      </main>
    </>
  )
}
