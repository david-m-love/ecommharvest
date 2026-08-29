import type { MetadataRoute } from 'next'

import { postPath } from '@/lib/blog'
import { publicPathFor } from '@/lib/builder-page'
import { payload } from '@/lib/entitlements'
import { absolute } from '@/lib/site-url'

/**
 * The list of pages worth indexing, built from the database.
 *
 * Generated rather than hand-written for the obvious reason: pages are created
 * in the builder now, and a hand-written list would be stale the first time
 * someone adds one. Each entry carries its real `updatedAt`, so a crawler knows
 * which pages actually changed.
 *
 * Only published pages, and only those not marked "hide from search" — a sitemap
 * that lists a draft is an invitation to index it.
 */
export const revalidate = 3600

const STATIC_PAGES = [
  { path: '/masterclass/thanks', priority: 0.3 },
  { path: '/privacy', priority: 0.3 },
  { path: '/terms', priority: 0.3 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []

  try {
    const p = await payload()
    const { docs } = await p.find({
      collection: 'pages',
      where: { status: { equals: 'published' } },
      depth: 0,
      limit: 500,
      overrideAccess: true,
    })

    for (const page of docs) {
      if (page.noindex) continue
      entries.push({
        url: absolute(publicPathFor(page.slug)),
        lastModified: page.updatedAt ? new Date(page.updatedAt) : undefined,
        changeFrequency: 'weekly',
        // The home page and the masterclass page are what this site is for.
        priority: page.slug === 'home' || page.slug === 'masterclass' ? 1 : 0.6,
      })
    }
  } catch {
    // A database hiccup should not produce a 500 at /sitemap.xml — an empty or
    // partial sitemap is recoverable, an error page teaches a crawler to stop
    // asking.
  }

  /**
   * Blog posts, and the index they live on.
   *
   * Same rules as pages: published only, and nothing marked "hide from search".
   * The index is listed even when empty, because it is linked from the menu and
   * a crawler that finds it before the first post should know it exists.
   */
  try {
    const p = await payload()
    const { docs } = await p.find({
      collection: 'posts',
      where: { status: { equals: 'published' } },
      sort: '-publishedAt',
      depth: 0,
      limit: 500,
      overrideAccess: true,
    })

    entries.push({
      url: absolute('/blog'),
      lastModified: docs[0]?.updatedAt ? new Date(docs[0].updatedAt) : undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    })

    for (const post of docs) {
      if (post.noindex) continue
      entries.push({
        url: absolute(postPath(post.slug)),
        lastModified: post.updatedAt ? new Date(post.updatedAt) : undefined,
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    }
  } catch {
    // Same reasoning as above: a partial sitemap beats a 500.
  }

  /**
   * Pages that are not in the database. Skipped if a builder page already owns
   * the same path, so nothing is listed twice — /privacy and /terms are builder
   * pages now, but the fallback components still exist behind them.
   */
  const claimed = new Set(entries.map((entry) => entry.url))
  for (const { path, priority } of STATIC_PAGES) {
    const url = absolute(path)
    if (!claimed.has(url)) entries.push({ url, changeFrequency: 'yearly', priority })
  }

  return entries
}
