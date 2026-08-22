/**
 * The site's own absolute address.
 *
 * Needed because social previews, canonical URLs and a sitemap all have to be
 * absolute: a crawler or Facebook's scraper has no idea what `/masterclass`
 * means, and an `og:image` given as a relative path is simply ignored — which is
 * a silent failure, the worst kind for something you cannot see on your own site.
 *
 * The order matters. `NEXT_PUBLIC_SITE_URL` wins so the canonical host can be
 * pinned; `VERCEL_PROJECT_PRODUCTION_URL` is the project's stable production
 * host; `VERCEL_URL` is the per-deploy URL, which is right for previews and
 * wrong for production; localhost is the fallback for development.
 */
const clean = (value: string) => value.replace(/\/+$/, '')

export const siteUrl = (): string => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return clean(process.env.NEXT_PUBLIC_SITE_URL)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${clean(process.env.VERCEL_PROJECT_PRODUCTION_URL)}`
  if (process.env.VERCEL_URL) return `https://${clean(process.env.VERCEL_URL)}`
  return 'http://localhost:3000'
}

/** An absolute URL for a path on this site. */
export const absolute = (path: string): string =>
  `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`
