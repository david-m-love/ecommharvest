import type { MetadataRoute } from 'next'

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
