import type { MetadataRoute } from 'next'

import { absolute } from '@/lib/site-url'

/**
 * What crawlers may and may not read.
 *
 * At `src/app/robots.ts`, not inside the `(frontend)` route group — Next serves
 * `/sitemap.xml` from a group but not `/robots.txt`, which simply 404s there with
 * no error anywhere. Half an hour to find, so: this file stays here.
 *
 * There was no robots file at all, which means every private area was fair game:
 * `/admin`, `/builder`, the member pages, and `/p/<slug>` — where an unpublished
 * page correctly 404s for the public but the URL itself is still a guess away.
 * Nothing here is a security boundary (authentication is), but a login screen
 * indexed under the brand name is untidy, and a half-finished page appearing in
 * search results is worse.
 *
 * `/social` is excluded because it is a generated picture, not a page. `/status`
 * because it is a diagnostic. `/register` because it is a placeholder that
 * forwards to GoHighLevel.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api/',
          '/builder',
          '/learn',
          '/members',
          '/login',
          '/p/',
          '/register',
          '/social',
          '/status',
        ],
      },
    ],
    sitemap: absolute('/sitemap.xml'),
  }
}
