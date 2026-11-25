import { Render } from '@measured/puck/rsc'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React from 'react'

import { config } from '@/blocks'
import { builderMetadata, loadBuilderPage } from '@/lib/builder-page'
import { siteMetadata } from '@/lib/site-styles'

const FALLBACK: Metadata = {
  title: 'eCommHarvest on YouTube',
  description:
    'Practical e-commerce marketing shown on real stores: ads, email, offers, conversion and website changes with AI.',
  alternates: { canonical: '/youtube' },
}

export async function generateMetadata(): Promise<Metadata> {
  return builderMetadata(await loadBuilderPage('youtube'), FALLBACK, {
    kicker: 'E-commerce marketing, on real stores',
  })
}

/**
 * The YouTube page. Every section is a block, so the videos and the channel link
 * are added in the builder with no deploy. No hand-written fallback, as with
 * `/weekly`: the record is created by a migration, and a page unpublished in the
 * admin should stop answering.
 */
export default async function YouTubePage() {
  const page = await loadBuilderPage('youtube')
  if (!page) notFound()
  return <Render config={config} data={page.data} metadata={await siteMetadata()} />
}
