import type { Metadata } from 'next'
import React from 'react'

import { Deck } from './Deck'
import { getSiteStyles } from '@/lib/site-styles'
import { EVENT_TITLE } from '@/lib/event'
import '@/styles/slides.css'

/**
 * The masterclass deck, presented from the browser.
 *
 * Not a landing page and not a page-builder page: it is a slideshow, and the
 * two things a slideshow needs — a fixed stage and keys that move it — are not
 * things the block editor can express. The content lives in `slides.tsx`, which
 * is a file to edit rather than a screen to click through; for seventeen slides
 * rewritten between rehearsals that is the smaller tool, and it is the reason
 * there is no new collection, no new admin view and no migration here.
 *
 * What it *does* reuse is the brand: the design tokens, the typefaces and the
 * logo all come from the same places the rest of the site takes them from, so a
 * colour changed in Site Styles changes the deck too.
 */
export const metadata: Metadata = {
  title: 'Slides',
  description: `Presentation deck for ${EVENT_TITLE}.`,
  alternates: { canonical: '/masterclass/slides' },
  /**
   * Never in search results. This is the presenter's own screen — an internal
   * artefact that happens to live at a URL so it can be opened on whichever
   * machine is running the call. `/masterclass` is the page that should rank.
   */
  robots: { index: false, follow: false },
}

export default async function SlidesPage() {
  /**
   * The logo, for the title slide. Soft: `getSiteStyles` returns nulls rather
   * than throwing if the database is unreachable, and the title slide falls
   * back to the wordmark — a deck that opens without its logo is recoverable
   * thirty seconds before a webinar; one that shows an error page is not.
   */
  const { logoUrl } = await getSiteStyles()
  return <Deck logoUrl={logoUrl} />
}
