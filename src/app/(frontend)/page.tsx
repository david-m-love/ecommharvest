import { Render } from '@measured/puck/rsc'
import type { Metadata } from 'next'
import React from 'react'

import { config } from '@/blocks'
import { builderMetadata, loadBuilderPage } from '@/lib/builder-page'
import { siteMetadata } from '@/lib/site-styles'
import { readGhlBlock } from '@/lib/ghl-block'

const FALLBACK: Metadata = {
  title: 'eCommHarvest — Q4 growth for e-commerce founders',
  description:
    'The strategy behind the quarter that decides your year: the promotional calendar, the offers, the email and SMS flows, and the paid social that makes all three cheaper.',
  alternates: { canonical: '/' },
}

export async function generateMetadata(): Promise<Metadata> {
  return builderMetadata(await loadBuilderPage('home'), FALLBACK)
}

/**
 * The home page.
 *
 * Edited in the page builder — open it from /builder — so the copy, the cards
 * and the logo can change without a deploy.
 *
 * If no `home` page exists yet (the seeding migration has not run), this falls
 * back to the generated block so the site is never blank. Once the page exists,
 * the block is no longer consulted: the builder owns this page.
 */
export default async function HomePage() {
  const page = await loadBuilderPage('home')
  if (page) return <Render config={config} data={page.data} metadata={await siteMetadata()} />

  const [body, cta] = await Promise.all([
    readGhlBlock('home-1-WITH-CSS.html'),
    readGhlBlock('home-2-cta.html'),
  ])
  return <div dangerouslySetInnerHTML={{ __html: body + cta }} />
}
