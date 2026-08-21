import { Render } from '@measured/puck/rsc'
import type { Metadata } from 'next'
import React from 'react'

import { config } from '@/blocks'
import { builderMetadata, loadBuilderPage } from '@/lib/builder-page'
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
export default async function MasterclassPage() {
  const page = await loadBuilderPage('masterclass')
  if (page) return <Render config={config} data={page.data} />
  return <div dangerouslySetInnerHTML={{ __html: await readGhlBlock('LANDING-PAGE.html') }} />
}
