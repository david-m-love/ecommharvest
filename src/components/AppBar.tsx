import Link from 'next/link'

import type { User } from '@/payload-types'
import { isAdmin } from '@/lib/access'

/** Shared chrome for signed-in pages. */
export const AppBar = ({
  user,
  current,
  /**
   * Whether to offer the Community tab.
   *
   * Passed in rather than checked here, because this is a synchronous component
   * and the answer is a database read. Every page that knows — the community
   * pages themselves got past the guard, so they pass `true` — says so; the
   * others leave it off, and a tab that is merely absent costs a member one
   * click from a page that does show it.
   */
  community,
}: {
  user: User
  current?: 'learn' | 'community'
  community?: boolean
}) => (
  <header className="appbar">
    <div className="appbar-in">
      <Link href="/learn" className="brand" aria-label="eCommHarvest">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="eCommHarvest" width={197} height={34} />
      </Link>
      <nav className="appbar-nav">
        <Link href="/learn" aria-current={current === 'learn' ? 'page' : undefined}>
          My courses
        </Link>
        {(community || current === 'community') && (
          <Link href="/community" aria-current={current === 'community' ? 'page' : undefined}>
            Community
          </Link>
        )}
        {isAdmin(user) && <Link href="/admin">Admin</Link>}
        {/* POST, so a link prefetch cannot sign the user out. */}
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="signout">
            Sign out
          </button>
        </form>
      </nav>
    </div>
  </header>
)
