import type { Metadata } from 'next'
import React from 'react'

import { Deck } from './Deck'
import { renderSlide, slideMeta, type SlideBlock } from '@/blocks/slides-render'
import { loadBuilderPage } from '@/lib/builder-page'
import { EVENT_TITLE } from '@/lib/event'
import { DECK_BLOCKS, DECK_SLUG } from '@/seed/deck'
import { getSiteStyles } from '@/lib/site-styles'
import '@/styles/slides.css'

/**
 * The masterclass deck, presented from the browser.
 *
 * A page-builder page like the rest of the site — same editor, same Media
 * library, same Save draft and Update live page — rendered as a slideshow
 * instead of a scrolling page. The slides come from the `masterclass-slides`
 * record; each block in it is one slide.
 *
 * Falls back to `src/seed/deck.ts` when that record is missing, exactly as
 * `/masterclass` falls back to its generated block. The window it covers is
 * real: between this deploying and its migration running there is no page row,
 * and "the deck 404s an hour before the webinar" is not a failure worth
 * allowing for the sake of tidiness.
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
  const [page, styles] = await Promise.all([loadBuilderPage(DECK_SLUG), getSiteStyles()])

  const blocks = (page?.data?.content as SlideBlock[] | undefined) ?? DECK_BLOCKS
  const ctx = { siteLogoUrl: styles.logoUrl }

  /**
   * Rendered here, on the server, and handed to the client component as
   * elements. The deck's machinery — the keys, the counter, the jump grid — has
   * to run in the browser; the slides themselves do not, so they do not ship as
   * JavaScript.
   */
  const slides = blocks
    .map((block, index) => ({ ...slideMeta(block, index), node: renderSlide(block, ctx) }))
    .filter((slide) => slide.node !== null)

  return <Deck slides={slides} />
}
