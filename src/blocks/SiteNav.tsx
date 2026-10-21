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
 * that swallows the page. It is up to six links, each of which may open a short
 * dropdown. The behaviours that actually
 * matter for a menu — Escape closes it, tapping a link closes it, the button
 * says whether it is open — are here; the rest would be weight for its own sake.
 */
export function SiteNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = React.useState(false)
  /** Which dropdown is open on a desktop, by position. Hover opens one too. */
  const [drop, setDrop] = React.useState<number | null>(null)
  const rowRef = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    if (!open && drop === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setDrop(null)
      }
    }
    // A dropdown opened by a click closes on a click anywhere else, the way
    // every other menu on the web behaves.
    const onClick = (event: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(event.target as Node)) setDrop(null)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
    }
  }, [open, drop])

  if (!links.length) return null

  const close = () => {
    setOpen(false)
    setDrop(null)
  }

  /**
   * External links open in a new tab; internal ones do not. Judged by the
   * href rather than a checkbox, because the GoHighLevel funnel is on another
   * host and leaving the site mid-funnel is the one case worth keeping the
   * original tab for. Judged after normalising, since a link typed without
   * `https://` is external and does not look it yet.
   */
  const anchor = (label: string, rawHref: string, className: string, key: string) => {
    const href = toHref(rawHref)
    const external = isExternalHref(href)
    return (
      <a
        key={key}
        href={href}
        className={className}
        onClick={close}
        {...(external ? { target: '_blank', rel: 'noopener' } : {})}
      >
        {label}
      </a>
    )
  }

  /** The desktop row: dropdowns open on hover, focus or a click. */
  const row = links.map((link, i) => {
    const key = `${link.label}-${link.href}-${i}`
    if (!link.children?.length) {
      return anchor(link.label, link.href, link.emphasis ? 'navlink navlink-cta' : 'navlink', key)
    }
    const isOpen = drop === i
    return (
      <div key={key} className={isOpen ? 'navitem navitem-open' : 'navitem'}>
        {/*
          The label is the link when the item has a page of its own, and the
          caret beside it opens the list; with no page, the label opens it.
          Either way there is a real button with aria-expanded for a keyboard
          or a screen reader — hover alone would leave both stranded.
        */}
        {link.href ? anchor(link.label, link.href, 'navlink', 'self') : null}
        <button
          type="button"
          className={link.href ? 'navlink navcaret' : 'navlink navcaret navcaret-label'}
          aria-expanded={isOpen}
          aria-label={link.href ? `More under ${link.label}` : undefined}
          onClick={() => setDrop(isOpen ? null : i)}
        >
          {link.href ? null : link.label}
          <span className="navcaret-icon" aria-hidden="true" />
        </button>
        <div className="navdrop">
          {link.children.map((child, j) => anchor(child.label, child.href, 'navdrop-link', `${j}`))}
        </div>
      </div>
    )
  })

  /** The phone panel: everything laid out, dropdowns as indented groups. */
  const panel = links.flatMap((link, i) => {
    const key = `${link.label}-${link.href}-${i}`
    const head = link.href
      ? anchor(link.label, link.href, link.emphasis ? 'navlink navlink-cta' : 'navlink', key)
      : (
          <p key={key} className="navgroup">
            {link.label}
          </p>
        )
    if (!link.children?.length) return [head]
    return [
      head,
      ...link.children.map((child, j) => anchor(child.label, child.href, 'navlink navlink-sub', `${key}-${j}`)),
    ]
  })

  return (
    <>
      {/* The desktop row. Hidden by CSS on small screens; the panel below is
          the phone's version of the same list. */}
      <nav className="topnav" aria-label="Main" ref={rowRef}>
        {row}
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
        {panel}
      </nav>
    </>
  )
}
