import type { Metadata } from 'next'
import Link from 'next/link'

import { requireMember } from '../guard'
import { AppBar } from '@/components/AppBar'
import { COMMUNITY_PATH, bylineOf } from '@/lib/community'
import { MAX_DISPLAY_NAME } from '@/lib/community-input'

export const metadata: Metadata = {
  title: 'How your name appears',
  robots: { index: false, follow: false },
}

/**
 * The whole profile: what to call this person.
 *
 * No bio, no avatar, no company field. This is a room where founders talk about
 * their actual numbers in front of people who might sell what they sell, and
 * the only thing the room needs to know is what to call them — which is also
 * the only thing they might want to change their mind about.
 */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const user = await requireMember(`${COMMUNITY_PATH}/profile`)
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
          <h1>How your name appears</h1>
          <p>
            This is the only thing other members see on your posts. Your email address is never
            shown.
          </p>
        </div>

        {error && <p className="notice">{error}</p>}

        <form method="post" action="/api/community/profile" className="composer">
          <input type="hidden" name="next" value={COMMUNITY_PATH} />
          <label htmlFor="displayName">Your name in the community</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            maxLength={MAX_DISPLAY_NAME}
            defaultValue={user.displayName || ''}
            placeholder={bylineOf(user)}
          />
          <p className="hint">
            Leave it empty and your posts show <strong>{bylineOf({ ...user, displayName: null })}</strong>.
          </p>

          <div className="composer-actions">
            <button type="submit" className="btn">
              Save
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
