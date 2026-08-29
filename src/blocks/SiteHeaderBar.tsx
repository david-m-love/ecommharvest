import React from 'react'

import { BlockImage } from './BlockImage'
import { SiteNav } from './SiteNav'
import { toHref } from '@/lib/href'
import type { NavLink } from '@/lib/site-styles'

/**
 * The bar at the top of the site: the logo, and the menu.
 *
 * Lives on its own rather than inside the Header block because two different
 * kinds of page need it. Pages built in the builder get it by dropping the
 * Header block on; routes written in code — the blog index, an article — need
 * the same bar without a block to put it in.
 *
 * One component so those cannot drift. A visitor arriving on an article from a
 * search result must see the same logo, the same menu and the same link home as
 * a visitor who came through the front door; two copies of this markup would
 * stay identical for about a fortnight.
 */
export function SiteHeaderBar({
  logoUrl,
  logoText,
  logoWidth,
  logoHeight,
  links,
  homeUrl,
  rightText,
}: {
  logoUrl?: string | null
  logoText?: string
  logoWidth?: number | null
  logoHeight?: number | null
  links?: NavLink[]
  homeUrl?: string
  rightText?: string
}) {
  const alt = logoText || ''
  const menu = links ?? []
  return (
    <header className="topbar">
      {/*
        `has-nav` tells the CSS whether to leave room for a menu button on a
        phone. Without it, a header with no menu still reserves the space and the
        centred logo sits visibly off-centre.
      */}
      <div className={menu.length ? 'topbar-in has-nav' : 'topbar-in'}>
        <a className="brand" href={toHref(homeUrl) || '/'} aria-label={logoText || 'Home'}>
          {logoUrl ? (
            <BlockImage
              image={{ url: logoUrl, alt, width: logoWidth ?? undefined, height: logoHeight ?? undefined }}
              fallbackAlt={alt}
              sizes="(max-width: 760px) 200px, 320px"
              // The one image in the first screenful on every page.
              priority
            />
          ) : (
            <strong
              style={{
                // Tied to the same --logo-h Site Styles sets, so "Logo size"
                // means one thing whether the logo is a picture or a name.
                fontSize: 'calc(var(--logo-h, 41px) * 0.55)',
                letterSpacing: '-0.02em',
              }}
            >
              {logoText}
            </strong>
          )}
        </a>
        {rightText ? (
          <div className="topbar-right">
            <span className="stamp">{rightText}</span>
          </div>
        ) : null}
        <SiteNav links={menu} />
      </div>
    </header>
  )
}

/**
 * The footer for routes written in code.
 *
 * The builder's Footer block carries its own words, because a landing page may
 * want different ones. A route has nobody to write them, and a public page still
 * needs to say who published it and link to the policies — which is a legal
 * requirement before running ads, not a decoration.
 */
export function SiteFooterBar({ note }: { note?: string }) {
  return (
    <footer>
      <div className="foot-in">
        <span>© {new Date().getFullYear()} eCommHarvest</span>
        <nav className="foot-nav">
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms &amp; Conditions</a>
        </nav>
        <span>{note || 'eCommHarvest is a trading name of Love Your Marketing LLC.'}</span>
      </div>
    </footer>
  )
}
