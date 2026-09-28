import { can } from '@/lib/capabilities'
import { FALLBACK_BYLINE, bylineOf, excerptOf } from '@/lib/community-text'
import { payload } from '@/lib/entitlements'
import type { Reply, Thread, User } from '@/payload-types'

export { bylineOf, formatWhen, paragraphsOf } from '@/lib/community-text'

/**
 * Reading the community: one place, so the feed, a thread, and the weekly-call
 * panel all agree about ordering, about who wrote what, and — the part that
 * matters — about what of a member is allowed onto the page.
 *
 * Mirrors `lib/blog.ts` deliberately, including the soft failures. A database
 * hiccup should cost the list, not the room.
 */

export const COMMUNITY_PATH = '/community'

export const threadPath = (slug: string) => `${COMMUNITY_PATH}/${slug}`

/** How many threads a page of the feed holds. */
export const PAGE_SIZE = 25

// --- Authors -------------------------------------------------------------

/**
 * Resolves author ids to bylines.
 *
 * `overrideAccess: true` with an explicit `select` rather than relaxing
 * `Users.access.read`, which returns `{ id: { equals: req.user.id } }` for
 * members — a member genuinely cannot read another member's row, so populating
 * the relationship the ordinary way yields nothing and "posted by" quietly
 * becomes "posted by Member".
 *
 * Widening that rule would fix the symptom and hand every member the whole user
 * table, email addresses included. Selecting three columns here fixes it and
 * makes leaking an address take a code change rather than an oversight.
 */
const bylines = async (ids: (string | number)[]): Promise<Map<string, string>> => {
  const unique = [...new Set(ids.map(String))].filter(Boolean)
  if (!unique.length) return new Map()

  const p = await payload()
  const { docs } = await p.find({
    collection: 'users',
    where: { id: { in: unique } },
    limit: unique.length,
    depth: 0,
    overrideAccess: true,
    select: { displayName: true, name: true, email: true },
  })
  return new Map(docs.map((doc) => [String(doc.id), bylineOf(doc as Partial<User>)]))
}

const idOf = (value: unknown): string | number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return (value as { id?: string | number }).id ?? null
  return value as string | number
}

// --- Shapes the pages render --------------------------------------------

export type ThreadCard = {
  id: string
  slug: string
  title: string
  excerpt: string
  author: string
  pinned: boolean
  locked: boolean
  replyCount: number
  lastActivity: string | null
  createdAt: string | null
}

export type ReplyView = { id: string; body: string; author: string; createdAt: string | null }

const toCard = (thread: Thread, author: string): ThreadCard => ({
  id: String(thread.id),
  slug: thread.slug || '',
  title: thread.title,
  excerpt: excerptOf(thread.body),
  author,
  pinned: Boolean(thread.pinned),
  locked: Boolean(thread.lockedAt),
  replyCount: thread.replyCount || 0,
  lastActivity: thread.lastReplyAt || thread.createdAt || null,
  createdAt: thread.createdAt || null,
})

// --- Queries -------------------------------------------------------------

/**
 * The feed: pinned threads first, then whatever was talked about most recently.
 *
 * Sorted by last activity rather than by when the question was asked, because
 * an answer arriving on a three-week-old thread is the most interesting thing
 * that happened today — and a room sorted by creation date buries it.
 */
export const listThreads = async ({
  page = 1,
  limit = PAGE_SIZE,
}: { page?: number; limit?: number } = {}): Promise<{
  threads: ThreadCard[]
  totalPages: number
  total: number
}> => {
  try {
    const p = await payload()
    const result = await p.find({
      collection: 'threads',
      limit,
      page,
      depth: 0,
      overrideAccess: true,
      sort: ['-pinned', '-lastReplyAt'],
    })

    const names = await bylines(
      result.docs.map((t) => idOf(t.author)).filter((id): id is string | number => id !== null),
    )

    return {
      threads: (result.docs as Thread[]).map((t) =>
        toCard(t, names.get(String(idOf(t.author))) || FALLBACK_BYLINE),
      ),
      totalPages: result.totalPages || 1,
      total: result.totalDocs || 0,
    }
  } catch (err) {
    console.error('community: could not list threads', err)
    return { threads: [], totalPages: 1, total: 0 }
  }
}

/** One thread and every reply on it, oldest first. */
export const getThread = async (
  slug: string,
): Promise<{ thread: ThreadCard; body: string; replies: ReplyView[] } | null> => {
  try {
    const p = await payload()
    const { docs } = await p.find({
      collection: 'threads',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const thread = docs[0] as Thread | undefined
    if (!thread) return null

    const replies = await p.find({
      collection: 'replies',
      where: { thread: { equals: thread.id } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
      // Oldest first: a question and its answers read in the order they
      // happened. Newest-first is for news, and this is not news.
      sort: 'createdAt',
    })

    const names = await bylines(
      [idOf(thread.author), ...replies.docs.map((r) => idOf(r.author))].filter(
        (id): id is string | number => id !== null,
      ),
    )

    return {
      thread: toCard(thread, names.get(String(idOf(thread.author))) || FALLBACK_BYLINE),
      body: thread.body,
      replies: (replies.docs as Reply[]).map((r) => ({
        id: String(r.id),
        body: r.body,
        author: names.get(String(idOf(r.author))) || FALLBACK_BYLINE,
        createdAt: r.createdAt || null,
      })),
    }
  } catch (err) {
    console.error('community: could not load thread', err)
    return null
  }
}

/** Whether this person may pin, lock and remove. */
export const isModerator = (user: User | null): boolean => can(user, 'community:moderate')
