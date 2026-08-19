import Link from 'next/link'

import type { User } from '@/payload-types'
import { isAdmin } from '@/lib/access'

/** Shared chrome for signed-in pages. */
export const AppBar = ({ user, current }: { user: User; current?: 'learn' }) => (
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
