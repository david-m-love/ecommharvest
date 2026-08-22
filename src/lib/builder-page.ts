import type { Metadata } from 'next'

import type { PageData } from '@/blocks'
import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { payload } from '@/lib/entitlements'

/**
 * Loads a page-builder page by slug, for the fixed routes that have one.
 *
 * `/` and `/masterclass` are page-builder pages now, so they can be edited and
 * republished without a deploy. They keep their own routes rather than living
 * under `/p/<slug>` because those two URLs are the ones that get printed, linked
 * and advertised — they should not move.
 *
 * Returns null when no such page exists, and the caller then falls back to the
 * generated block. That fallback is the point: the seeding happens in a
 * migration, so between pushing this code and the migration running there is a
 * window where the page row is not there yet. Falling back means the site keeps
 * showing the real page throughout, instead of a 404 during a deploy.
 */

export type LoadedPage = {
  data: PageData
  title: string
  description?: string
  noindex: boolean
  isDraft: boolean
}

export const loadBuilderPage = async (slug: string): Promise<LoadedPage | null> => {
  try {
    const p = await payload()
    const { docs } = await p.find({
      collection: 'pages',
      where: { slug: { equals: slug } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
    const page = docs[0]
    if (!page) return null

    // Unpublished is visible only to the team, exactly as at /p/<slug>. On these
    // two routes a draft must never replace the live page for the public.
    if (page.status !== 'published') {
      const user = await getCurrentUser()
      if (!can(user, 'pages:read') && !can(user, 'pages:write')) return null
    }

    const data = page.content as PageData | null
    if (!data || !Array.isArray(data.content) || data.content.length === 0) return null

    return {
      data,
      title: page.title,
      description: page.description || undefined,
      noindex: Boolean(page.noindex),
      isDraft: page.status !== 'published',
    }
  } catch {
    // A database hiccup falls back to the generated block rather than 500ing the
    // home page.
    return null
  }
}

/** Metadata from the page record, with the route's own values as the default. */
export const builderMetadata = (
  page: LoadedPage | null,
  fallback: Metadata,
): Metadata => {
  if (!page) return fallback
  return {
    ...fallback,
    title: page.title,
    description: page.description ?? fallback.description,
    robots: page.noindex || page.isDraft ? { index: false, follow: false } : fallback.robots,
  }
}

/**
 * Where a page actually lives.
 *
 * Four slugs own a route of their own; everything else is served under /p/.
 * Defined here because three places need the same answer — the page list, the
 * editor's "View live" link, and the redirect that stops /p/home serving a
 * second copy of the home page — and three copies of this map would drift.
 */
export const OWN_ROUTES: Record<string, string> = {
  home: '/',
  masterclass: '/masterclass',
  privacy: '/privacy',
  terms: '/terms',
}

export const publicPathFor = (slug: string): string => OWN_ROUTES[slug] ?? `/p/${slug}`
