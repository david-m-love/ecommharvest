import type { Metadata } from 'next'
import Link from 'next/link'

import { requireMember } from '../guard'
import { AppBar } from '@/components/AppBar'
import { COMMUNITY_PATH, bylineOf } from '@/lib/community'
import { MAX_BODY, MAX_TITLE } from '@/lib/community-input'

export const metadata: Metadata = {
  title: 'Ask a question',
  robots: { index: false, follow: false },
}

/**
 * The composer. A title and a body, and nothing else.
 *
 * No categories, no tags, no flair. Every field here is a decision somebody has
 * to make before they are allowed to ask their question, and the failure mode
 * of a small room is not disorganisation — it is silence.
 */
export default async function NewThreadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const user = await requireMember(`${COMMUNITY_PATH}/new`)
  const { error } = await searchParams

  return (
    <>
      <AppBar user={user} current="community" community />
      <main className="shell threadwrap">
        <p className="thread-meta">
          <Link href={COMMUNITY_PATH} className="plainlink">
            ← All questions
          </Link>
        </p>

        <div className="pagehead">
          <h1>Ask a question</h1>
          <p>
            Posting as <strong>{bylineOf(user)}</strong>.{' '}
            <Link href={`${COMMUNITY_PATH}/profile`} className="plainlink">
              Change that
            </Link>
            .
          </p>
        </div>

        {error && <p className="notice">{error}</p>}

        <form method="post" action="/api/community/threads" className="composer">
          <label htmlFor="title">The question</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={MAX_TITLE}
            placeholder="How deep should I discount on Black Friday?"
          />
          <p className="hint">
            Write it the way you would search for it in three months.
          </p>

          <label htmlFor="body">The detail</label>
          <textarea
            id="body"
            name="body"
            required
            maxLength={MAX_BODY}
            placeholder="What you have tried, what the numbers are, and what you are deciding between. Real numbers get better answers than round ones."
          />

          <div className="composer-actions">
            <button type="submit" className="btn">
              Post question
            </button>
            <Link href={COMMUNITY_PATH} className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </>
  )
}
