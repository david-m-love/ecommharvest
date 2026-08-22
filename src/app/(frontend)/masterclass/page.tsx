import { Render } from '@measured/puck/rsc'
import type { Metadata } from 'next'
import React from 'react'

import { config } from '@/blocks'
import { builderMetadata, loadBuilderPage } from '@/lib/builder-page'
import { siteMetadata } from '@/lib/site-styles'
import { readGhlBlock } from '@/lib/ghl-block'

const FALLBACK: Metadata = {
  title: 'Your Q4 Revenue Playbook, Built in 90 Minutes',
  description:
    'Thursday, September 3 at 11:00 AM MT. A free 90-minute masterclass for LDS e-commerce founders. Build your Q4 promotional calendar, offers, email and SMS plan in one sitting — without headaches or sacrificing family time.',
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
 * Hard-coded rather than read from the page's own copy: parsing "Thursday,
 * September 3 · 11:00 AM MT" out of edited body text would break the first time
 * someone reworded it, and quietly claim the wrong date to Google. When the
 * event moves, this moves with it.
 */
const EVENT_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Your Q4 Revenue Playbook, Built in 90 Minutes',
  description:
    'A free 90-minute masterclass for LDS e-commerce founders. Build your Q4 promotional calendar, offers, and email and SMS plan in one sitting.',
  startDate: '2026-09-03T11:00:00-06:00',
  endDate: '2026-09-03T12:30:00-06:00',
  eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
  eventStatus: 'https://schema.org/EventScheduled',
  location: {
    '@type': 'VirtualLocation',
    url: 'https://go.ecommharvest.com/masterclass',
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
    url: 'https://go.ecommharvest.com/register',
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
