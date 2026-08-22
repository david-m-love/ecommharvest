'use client'

import React from 'react'

import { isExternalHref, toHref } from '@/lib/href'
import type { NavLink } from '@/lib/site-styles'

/**
 * The site menu: inline on a desktop, behind a button on a phone.
 *
 * A client component because a menu that opens is the one part of the header
 * that has to react to a tap. Everything else about the header stays
 * server-rendered, so a visitor downloads a few hundred bytes of JavaScript for
 * this and nothing else.
 *
 * Deliberately plain: no animation library, no focus-trapping modal, no overlay
 * that swallows the page. It is up to six links. The behaviours that actually
 * matter for a menu — Escape closes it, tapping a link closes it, the button
 * says whether it is open — are here; the rest would be weight for its own sake.
 */
export function SiteNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!links.length) return null

  const items = links.map((link) => {
    /**
     * External links open in a new tab; internal ones do not. Judged by the
     * href rather than a checkbox, because the GoHighLevel funnel is on another
     * host and leaving the site mid-funnel is the one case worth keeping the
     * original tab for. Judged after normalising, since a link typed without
     * `https://` is external and does not look it yet.
     */
    const href = toHref(link.href)
    const external = isExternalHref(href)
    return (
      <a
        key={`${link.label}-${link.href}`}
        href={href}
        className={link.emphasis ? 'navlink navlink-cta' : 'navlink'}
        onClick={() => setOpen(false)}
        {...(external ? { target: '_blank', rel: 'noopener' } : {})}
      >
        {link.label}
      </a>
    )
  })

  return (
    <>
      {/* The desktop row. Hidden by CSS on small screens rather than removed,
          so there is one list of links in the markup, not two. */}
      <nav className="topnav" aria-label="Main">
        {items}
      </nav>

      <button
        type="button"
        className="navtoggle"
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((was) => !was)}
      >
        {/* Two bars and a middle one that vanishes: a close icon without a
            second SVG to keep in step. */}
        <span className={open ? 'navbars navbars-open' : 'navbars'} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      <nav id="site-menu" className={open ? 'navpanel navpanel-open' : 'navpanel'} aria-label="Main">
        {items}
      </nav>
    </>
  )
}
