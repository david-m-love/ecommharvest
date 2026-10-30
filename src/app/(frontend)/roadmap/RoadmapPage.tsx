import { Render } from '@measured/puck/rsc'
import { notFound } from 'next/navigation'
import React from 'react'

import { config } from '@/blocks'
import { loadBuilderPage } from '@/lib/builder-page'
import { siteMetadata } from '@/lib/site-styles'

/**
 * One renderer for the three Roadmap pages.
 *
 * The wrapper class is what scopes the Roadmap type and colours (see the
 * `.page-roadmap` rules in `design-system.css`), so no other page can pick them
 * up. Lora and Inter come from Google Fonts, as the site's own fonts already do;
 * the stylesheet is hoisted into the head, and the font stacks fall back to
 * Georgia and the system font if it is slow.
 *
 * No hand-written fallback, same as `/weekly`: the record is created by a
 * migration, and a page deliberately unpublished in the admin should stop
 * answering rather than serve a copy kept in code.
 */
export async function RoadmapPage({ slug }: { slug: string }) {
  const page = await loadBuilderPage(slug)
  if (!page) notFound()
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@500;600;700&display=swap"
        precedence="default"
      />
      <div className="page-roadmap">
        <Render config={config} data={page.data} metadata={await siteMetadata()} />
      </div>
    </>
  )
}
