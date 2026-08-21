import type { Metadata } from 'next'
import React from 'react'

import { getSiteStyles } from '@/lib/site-styles'
import '@/styles/design-system.css'

/**
 * Every page under this layout renders per request, rather than being frozen
 * into HTML at deploy time.
 *
 * This is here and not on individual pages because it is the layout that does
 * the request-time read: the brand palette below comes from the database, and
 * the two builder pages read their content from it too. Without this, `next
 * build` prerenders anything that does not look request-specific — so changing a
 * colour in Site Styles, or pressing "Update live page" in the builder, would
 * change the database and nothing a visitor sees, until the next deploy.
 *
 * Development cannot show that: `next dev` renders every request fresh. The
 * check in `test/prerender.mjs` reads the build output and fails if these routes
 * go static again.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: {
    default: 'eCommHarvest',
    template: '%s — eCommHarvest',
  },
  description: 'Q4 growth strategy for e-commerce founders.',
}

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  /**
   * The brand palette, read from Site Styles and emitted after the design
   * system's own :root block so it overrides it. One <style> tag, a few hundred
   * bytes, and every page picks up a colour change with no rebuild.
   */
  const { css } = await getSiteStyles()

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {css ? <style id="site-styles" dangerouslySetInnerHTML={{ __html: css }} /> : null}
      </head>
      <body>{children}</body>
    </html>
  )
}
