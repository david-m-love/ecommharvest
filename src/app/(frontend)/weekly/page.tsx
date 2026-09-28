import { Render } from '@measured/puck/rsc'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React from 'react'

import { config } from '@/blocks'
import { builderMetadata, loadBuilderPage } from '@/lib/builder-page'
import { siteMetadata } from '@/lib/site-styles'
import { WEEKLY_SOCIAL, WEEKLY_TITLE } from '@/lib/weekly'

const FALLBACK: Metadata = {
  title: WEEKLY_TITLE,
  description:
    'Weekly e-commerce coaching for LDS founders — ads, email, offers, conversion, and help deciding what to work on next.',
  alternates: { canonical: '/weekly' },
}

export async function generateMetadata(): Promise<Metadata> {
  return builderMetadata(await loadBuilderPage('weekly'), FALLBACK, WEEKLY_SOCIAL)
}

/**
 * The long membership page: proof-heavy, and improved after launch.
 *
 * Every section is a block, so the whole page is editable at `/builder` without
 * a deploy — which is the point of building it this way rather than as markup in
 * this file. This route only decides the URL and the metadata.
 *
 * No hand-written fallback, unlike the masterclass funnel. That fallback exists
 * because those pages were moved off GoHighLevel mid-campaign and could not be
 * allowed to 404 for a moment; here the record is created by a migration before
 * the route can ever be reached, and a page deliberately unpublished in the
 * admin *should* stop answering rather than quietly serve a copy kept in code.
 */
export default async function WeeklyPage() {
  const page = await loadBuilderPage('weekly')
  if (!page) notFound()
  return <Render config={config} data={page.data} metadata={await siteMetadata()} />
}
