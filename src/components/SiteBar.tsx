import Link from 'next/link'

import { isAdmin } from '@/lib/access'
import { can } from '@/lib/capabilities'
import type { User } from '@/payload-types'

/**
 * Navigation for the site-building screens.
 *
 * The page builder lives outside Payload's admin shell — it is an app route, not
 * an admin view — so it inherited none of the admin's sidebar. The result was a
 * dead end: a page listing pages, with no way to reach Media, Site Styles or
 * anything else without typing a URL.
 *
 * So this is the sidebar's job done in a top bar: the few places someone editing
 * the site actually moves between. Each link is shown only if the person can use
 * it, because a link that answers with "not allowed" is worse than no link.
 */
export const SiteBar = ({
  user,
  current,
}: {
  user: User
  current?: 'pages' | 'media' | 'styles'
}) => {
  const links: { href: string; label: string; key?: 'pages' | 'media' | 'styles' }[] = [
    { href: '/builder', label: 'Pages', key: 'pages' },
    { href: '/admin/collections/media', label: 'Images & files', key: 'media' },
  ]

  // Site Styles is the one screen that changes every page at once, so it is
  // gated the same way publishing is.
  if (isAdmin(user) || can(user, 'pages:publish'))
    links.push({ href: '/admin/globals/site-styles', label: 'Site Styles', key: 'styles' })
  if (isAdmin(user) || can(user, 'users:manage'))
    links.push({ href: '/admin/collections/users', label: 'People' })
  links.push({ href: '/admin', label: 'Admin' })

  return (
    <header className="appbar">
      <div className="appbar-in">
        <Link href="/builder" className="brand" aria-label="eCommHarvest">
          <strong style={{ fontSize: 16, letterSpacing: '-0.02em' }}>eCommHarvest</strong>
        </Link>
        <nav className="appbar-nav">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.key && link.key === current ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
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
}
