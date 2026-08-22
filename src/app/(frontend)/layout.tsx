import type { Metadata } from 'next'
import React from 'react'

import { Analytics } from '@vercel/analytics/next'

import { MetaPixel } from '@/components/MetaPixel'
import { trackingDecision } from '@/lib/consent'
import { getSiteStyles } from '@/lib/site-styles'
import { absolute, siteUrl } from '@/lib/site-url'
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

/**
 * Site-wide metadata, including what a shared link looks like.
 *
 * `metadataBase` is what makes relative URLs elsewhere resolve to absolute ones:
 * without it, an `og:image` given as a path is silently dropped by Facebook's
 * scraper, and a canonical of `/masterclass` means nothing to a crawler. Silent
 * is the problem — nothing on the site looks wrong when this is missing.
 *
 * Individual pages override title, description and image; everything else is
 * inherited, so a new page gets a working share card without doing anything.
 */
const DESCRIPTION =
  'The strategy behind the quarter that decides your year: the promotional calendar, the offers, the email and SMS flows, and the paid social that makes all three cheaper.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'eCommHarvest — Q4 growth for e-commerce founders',
    template: '%s — eCommHarvest',
  },
  description: DESCRIPTION,
  applicationName: 'eCommHarvest',
  openGraph: {
    type: 'website',
    siteName: 'eCommHarvest',
    locale: 'en_US',
    url: siteUrl(),
    title: 'eCommHarvest — Q4 growth for e-commerce founders',
    description: DESCRIPTION,
    images: [
      {
        url: '/social',
        width: 1200,
        height: 630,
        alt: 'eCommHarvest — Q4 growth for e-commerce founders',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eCommHarvest — Q4 growth for e-commerce founders',
    description: DESCRIPTION,
    images: ['/social'],
  },
}

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  /**
   * The brand palette, read from Site Styles and emitted after the design
   * system's own :root block so it overrides it. One <style> tag, a few hundred
   * bytes, and every page picks up a colour change with no rebuild.
   */
  const { css, metaPixelId } = await getSiteStyles()

  /**
   * Whether an advertising pixel may load for this visitor: honouring a Global
   * Privacy Control signal everywhere, asking first in the UK, EEA and
   * Switzerland, loading elsewhere. Decided on the server so that a visitor who
   * has opted out never receives the script at all.
   */
  const tracking = metaPixelId ? await trackingDecision() : null

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
        {/*
          Who runs this site, in the form search engines read. Names the legal
          entity behind the trading name, which is the same thing the legal pages
          say — one claim, two audiences.
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'eCommHarvest',
              legalName: 'Love Your Marketing LLC',
              url: siteUrl(),
              logo: absolute('/logo.png'),
              email: 'privacy@ecommharvest.com',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Rexburg',
                addressRegion: 'ID',
                addressCountry: 'US',
              },
              description: DESCRIPTION,
            }),
          }}
        />
      </head>
      <body>
        {children}
        {/*
          Page views, from Vercel's own analytics: no cookies, no cross-site
          identifiers, nothing that needs a banner — which is the whole reason
          for choosing it over Google Analytics for a site whose only job is
          counting registrations.
        */}
        <Analytics />
        {metaPixelId && tracking ? (
          <MetaPixel
            pixelId={metaPixelId}
            mode={tracking.mode === 'refused' ? 'refused' : tracking.mode}
          />
        ) : null}
      </body>
    </html>
  )
}
