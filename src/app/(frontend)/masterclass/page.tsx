import { Render } from '@measured/puck/rsc'
import type { Metadata } from 'next'
import React from 'react'

import { config } from '@/blocks'
import { builderMetadata, loadBuilderPage } from '@/lib/builder-page'
import { EVENT_END_ISO, EVENT_START_ISO, EVENT_TITLE, REGISTER_URL } from '@/lib/event'
import { siteMetadata } from '@/lib/site-styles'
import { readGhlBlock } from '@/lib/ghl-block'

const FALLBACK: Metadata = {
  title: EVENT_TITLE,
  description:
    'Thursday, September 24 at 11:00 AM Mountain Time. A free 60-minute working masterclass for LDS e-commerce founders: build your Q4 promotional calendar, offers, email and SMS plan, traffic priorities and the numbers behind them.',
  alternates: { canonical: '/masterclass' },
}

export async function generateMetadata(): Promise<Metadata> {
  return builderMetadata(await loadBuilderPage('masterclass'), FALLBACK)
}

/**
 * The masterclass page, editable in the page builder.
 *
 * Worth knowing: this page and the block pasted into GoHighLevel are now two
 * separate things. They started identical — the builder version was extracted
 * from the block — but editing here does not change what is in GHL, and
 * re-running `npm run ghl:build` does not change this. The GHL funnel on
 * go.ecommharvest.com is the page that takes registrations; this is the page on
 * the site. Keep them in step by hand, or pick one as the one you advertise.
 *
 * Falls back to the generated block until the seeding migration has run.
 */
/**
 * The session as structured data.
 *
 * This is the one page on the site with a date attached, which is exactly what
 * search engines can display specially — the event, the time, and that it is
 * free and online. Registration points at the GoHighLevel funnel, because that
 * is where a seat is actually taken.
 *
 * The times come from `src/lib/event.ts` rather than from the page's own copy:
 * parsing "Thursday, September 24 · 11:00 AM MT" out of body text somebody can
 * reword in the builder would break the first time they did, and quietly claim
 * the wrong date to Google. One constant, and everything that has to agree
 * does.
 */
const EVENT_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: EVENT_TITLE,
  description:
    'A free 60-minute working masterclass for LDS e-commerce founders. Build your Q4 promotional calendar, offer strategy, email and SMS plan, traffic priorities and the numbers behind them — with a workbook to finish afterwards.',
  startDate: EVENT_START_ISO,
  endDate: EVENT_END_ISO,
  eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
  eventStatus: 'https://schema.org/EventScheduled',
  location: {
    '@type': 'VirtualLocation',
    /**
     * Where a person goes to take part — the same address the buttons use, not
     * one derived from whichever host happens to be rendering. Google shows this
     * as the place to register, so a page whose buttons go one way and whose
     * structured data goes another is advertising two registration pages for one
     * event.
     */
    url: REGISTER_URL,
  },
  organizer: {
    '@type': 'Organization',
    name: 'eCommHarvest',
    url: 'https://ecommharvest.com',
  },
  performer: [
    { '@type': 'Person', name: 'David Love' },
    { '@type': 'Person', name: 'Derek Crimin' },
  ],
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
    url: REGISTER_URL,
    validFrom: '2026-08-01T00:00:00-06:00',
  },
}

export default async function MasterclassPage() {
  const page = await loadBuilderPage('masterclass')
  const schema = (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(EVENT_SCHEMA) }}
    />
  )

  if (page)
    return (
      <>
        {schema}
        <Render config={config} data={page.data} metadata={await siteMetadata()} />
      </>
    )
  return (
    <>
      {schema}
      <div dangerouslySetInnerHTML={{ __html: await readGhlBlock('LANDING-PAGE.html') }} />
    </>
  )
}
