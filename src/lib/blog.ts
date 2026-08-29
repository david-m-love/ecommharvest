import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { payload } from '@/lib/entitlements'
import type { Post } from '@/payload-types'

/**
 * Reading the blog: one place, so the index, the post, the feed, the sitemap and
 * the home-page block all agree about what is published and in what order.
 */

/** Where a post lives. One definition, used by every link and the sitemap. */
export const postPath = (slug: string) => `/blog/${slug}`

export const BLOG_PATH = '/blog'

/**
 * Published posts, newest first.
 *
 * Ordered by the date on the post rather than when the row was written, because
 * a post drafted in August and published in October belongs in October — and
 * backdating an evergreen piece is a normal thing to want.
 */
export const listPosts = async ({
  limit = 24,
  page = 1,
}: { limit?: number; page?: number } = {}): Promise<{ posts: Post[]; totalPages: number }> => {
  try {
    const p = await payload()
    const result = await p.find({
      collection: 'posts',
      where: { status: { equals: 'published' } },
      sort: '-publishedAt',
      depth: 1,
      limit,
      page,
      overrideAccess: true,
    })
    return { posts: result.docs as Post[], totalPages: result.totalPages || 1 }
  } catch {
    /**
     * An empty blog rather than a 500. The index is a public page linked from
     * the menu; a database hiccup should cost the list, not the site.
     */
    return { posts: [], totalPages: 1 }
  }
}

export const findPost = async (slug: string): Promise<Post | null> => {
  try {
    const p = await payload()
    const { docs } = await p.find({
      collection: 'posts',
      where: { slug: { equals: slug } },
      // depth 1 so the cover image and any images inside the body arrive as
      // records rather than ids — the renderer has nothing to draw from an id.
      depth: 1,
      limit: 1,
      overrideAccess: true,
    })
    return (docs[0] as Post) ?? null
  } catch {
    return null
  }
}

/**
 * Whether this visitor may see this post.
 *
 * A draft 404s for the public rather than 403ing, for the same reason an
 * unpublished page does: a 403 confirms the post exists, which leaks an
 * unannounced piece to anyone guessing URLs.
 */
export const postVisible = async (post: Post | null): Promise<boolean> => {
  if (!post) return false
  if (post.status === 'published') return true
  const user = await getCurrentUser()
  return can(user, 'posts:write') || can(user, 'posts:publish')
}

/** The date to show, and to sort by, with a sensible fallback. */
export const postDate = (post: Pick<Post, 'publishedAt' | 'createdAt'>): Date | null => {
  const raw = post.publishedAt || post.createdAt
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * A date a reader can scan.
 *
 * Fixed to en-GB and UTC on purpose: the server and the browser must agree, or
 * React re-renders the date on hydration and logs a mismatch — and a post dated
 * a day earlier for readers in one timezone is a small lie about when it was
 * written.
 */
export const formatPostDate = (date: Date | null): string =>
  date
    ? new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date)
    : ''

/** The cover image, when it was loaded as a record rather than an id. */
export const postCover = (post: Post) => {
  const cover = post.cover
  if (!cover || typeof cover !== 'object') return null
  const { url, alt, width, height } = cover as { url?: string; alt?: string; width?: number; height?: number }
  return url ? { url, alt: alt || post.title, width, height } : null
}
