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
    'Weekly group coaching for LDS e-commerce founders who want experienced help deciding what to do next.',
  alternates: { canonical: '/join' },
}

export async function generateMetadata(): Promise<Metadata> {
  return builderMetadata(await loadBuilderPage('join'), FALLBACK, WEEKLY_SOCIAL)
}

/**
 * The short membership page — the one that goes out first.
 *
 * Same blocks as `/weekly`, fewer of them: only the sections that carry
 * conversion weight, so it can be finished and checked in a day. Kept as a
 * separate page rather than a variant of `/weekly` so the long one can keep
 * being rewritten while this one is taking traffic.
 *
 * A redirect from here to `/weekly` is deliberately *not* set up. That is a
 * decision to make after both pages have been seen side by side, not a default
 * baked in on day one.
 */
export default async function JoinPage() {
  const page = await loadBuilderPage('join')
  if (!page) notFound()
  return <Render config={config} data={page.data} metadata={await siteMetadata()} />
}
