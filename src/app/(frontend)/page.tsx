import type { Metadata } from 'next'
import React from 'react'

import { readGhlBlock } from '@/lib/ghl-block'

export const metadata: Metadata = {
  title: 'eCommHarvest — Q4 growth for e-commerce founders',
  description:
    'The strategy behind the quarter that decides your year: the promotional calendar, the offers, the email and SMS flows, and the paid social that makes all three cheaper.',
  alternates: { canonical: '/' },
}

/**
 * The home page.
 *
 * Built from the same generated blocks as everything else — `ghl/src/home.html`
 * through `npm run ghl:build` — so the design lives in one place and the version
 * pasted into GoHighLevel cannot drift from the version served here.
 *
 * This replaced a hand-written placeholder that was one hero and a button. Edit
 * `ghl/src/home.html`, run `npm run ghl:build`, commit the blocks.
 */
export default async function HomePage() {
  const [body, cta] = await Promise.all([
    readGhlBlock('home-1-WITH-CSS.html'),
    readGhlBlock('home-2-cta.html'),
  ])
  return <div dangerouslySetInnerHTML={{ __html: body + cta }} />
}
