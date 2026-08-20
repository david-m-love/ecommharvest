import type { Metadata } from 'next'
import React from 'react'

import '@/styles/design-system.css'

export const metadata: Metadata = {
  title: {
    default: 'eCommHarvest',
    template: '%s — eCommHarvest',
  },
  description: 'Q4 growth strategy for e-commerce founders.',
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
