import type { Metadata } from 'next'
import React from 'react'

import { getSiteStyles } from '@/lib/site-styles'
import '@/styles/design-system.css'

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
