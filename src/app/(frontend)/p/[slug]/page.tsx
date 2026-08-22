import { Render } from '@measured/puck/rsc'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import React from 'react'

import { type PageData, config } from '@/blocks'
import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { payload } from '@/lib/entitlements'
import { siteMetadata } from '@/lib/site-styles'

/**
 * A page built in the builder, served publicly.
 *
 * Rendered with Puck's RSC entry point, so the **builder's own bundle never
 * reaches a visitor** — blocks are server-rendered HTML plus the design system
 * stylesheet, and the editor's few hundred kilobytes stay behind the login. (Next
 * still ships its own React runtime; the point is that the page builder is not
 * part of the page it builds.)
 */

/**
 * Pages that own a route of their own, so they are not served twice.
 *
 * `home` and `masterclass` are page-builder pages rendered at `/` and
 * `/masterclass`. Without this, `/p/home` would render the same page at a second
 * URL — duplicate content, and two addresses to keep straight. Redirecting means
 * every page has exactly one address.
 */
const OWN_ROUTE: Record<string, string> = { home: '/', masterclass: '/masterclass' }

const findPage = async (slug: string) => {
  const p = await payload()
  const { docs } = await p.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

/**
 * Drafts are visible to the team and 404 for everyone else.
 *
 * A 404 rather than a 403 on purpose: a 403 confirms the page exists, which
 * leaks an unannounced launch to anyone guessing URLs.
 */
const visible = async (page: Awaited<ReturnType<typeof findPage>>) => {
  if (!page) return false
  if (page.status === 'published') return true
  const user = await getCurrentUser()
  return can(user, 'pages:read') || can(user, 'pages:write')
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = await findPage(slug)
  if (!page || !(await visible(page))) return { title: 'Not found' }
  return {
    title: page.title,
    description: page.description || undefined,
    // Drafts are never indexable regardless of the checkbox, since a draft that
    // got crawled is the failure this flag exists to prevent.
    robots: page.noindex || page.status !== 'published' ? { index: false, follow: false } : undefined,
  }
}

export default async function BuiltPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (OWN_ROUTE[slug]) permanentRedirect(OWN_ROUTE[slug])
  const page = await findPage(slug)
  if (!page || !(await visible(page))) notFound()

  const data = page.content as PageData | null
  if (!data || !Array.isArray(data.content)) {
    // An empty page is a real state — created but never edited. Say so rather
    // than rendering a blank white screen that looks like a crash.
    return (
      <main className="slot">
        <div className="slot-in">
          <p className="eyebrow">Draft</p>
          <h1>Nothing on this page yet.</h1>
          <p className="lede">Open it in the builder and drag a block in.</p>
        </div>
      </main>
    )
  }

  return (
    <>
      {page.status !== 'published' ? (
        <div className="hostbar">
          <div className="hostbar-in">
            <p className="host-label" style={{ margin: 0 }}>
              Draft preview — not visible to the public
            </p>
          </div>
        </div>
      ) : null}
      <Render config={config} data={data} metadata={await siteMetadata()} />
    </>
  )
}
