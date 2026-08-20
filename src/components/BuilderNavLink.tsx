import Link from 'next/link'
import React from 'react'

/**
 * A "Page builder" entry in Payload's admin sidebar.
 *
 * The canvas lives at `/builder` rather than inside the admin panel because
 * Puck needs the whole window; squeezed beside Payload's sidebar it is
 * unusable. This link is what makes it feel like part of the admin anyway —
 * one nav item, same place as everything else.
 *
 * Rendered by Payload through its import map, so `admin.components.afterNavLinks`
 * references it by path and `npm run generate:importmap` must be re-run if that
 * path ever changes.
 */
export const BuilderNavLink: React.FC = () => (
  <nav
    style={{
      borderTop: '1px solid var(--theme-elevation-100)',
      marginTop: 'var(--base)',
      paddingTop: 'var(--base)',
    }}
  >
    <Link
      href="/builder"
      style={{ display: 'block', padding: '4px 0', textDecoration: 'none' }}
      // Payload's own nav links use this class, so the styling and active state
      // come from the panel rather than being reinvented here.
      className="nav__link"
    >
      Page builder
    </Link>
  </nav>
)

export default BuilderNavLink
