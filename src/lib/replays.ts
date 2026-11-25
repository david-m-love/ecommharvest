import { payload } from '@/lib/entitlements'
import { replayEmbedUrl } from '@/lib/replay'
import type { Replay, ReplayFile, Thread } from '@/payload-types'

/**
 * Reading the replays library.
 *
 * Same shape as `lib/community.ts`: one place, soft failures (a database hiccup
 * costs the list, not the room), and `overrideAccess` because the pages have
 * already decided who is allowed in. The page guard is the check; the
 * `memberCanReadPublished` rule on the collection is what stops `/api/replays`
 * being a way around it.
 *
 * Drafts are only ever returned to a moderator, who needs to see a replay before
 * it goes out.
 */

export const REPLAYS_PATH = '/replays'
export const replayPath = (slug: string) => `${REPLAYS_PATH}/${slug}`

export type ReplayCard = {
  id: string
  slug: string
  title: string
  summary: string
  recordedAt: string | null
  hasVideo: boolean
  downloads: number
  published: boolean
}

export type ReplayDownload = { label: string; url: string; filename: string; size: string }

export type ReplayView = {
  card: ReplayCard
  embed: string | null
  notes: unknown
  downloads: ReplayDownload[]
  thread: { slug: string; title: string } | null
}

/** "March 3, 2026". UTC, because a date-only value is stored at noon UTC and must not slide a day. */
export const formatDay = (value?: string | null): string => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

const humanSize = (bytes?: number | null): string => {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * The address of a download, as a path on this site.
 *
 * Payload may store an absolute URL when a server URL is configured. A path is
 * same-origin on every hostname the site answers to, and it keeps the link going
 * through this site's own route, which is the one that checks membership.
 */
const pathOf = (url: string): string => {
  try {
    const parsed = new URL(url, 'http://placeholder.invalid')
    return parsed.host === 'placeholder.invalid' || parsed.pathname.startsWith('/api/')
      ? parsed.pathname + parsed.search
      : url
  } catch {
    return url
  }
}

const toCard = (replay: Replay): ReplayCard => ({
  id: String(replay.id),
  slug: replay.slug,
  title: replay.title,
  summary: replay.summary || '',
  recordedAt: replay.recordedAt || null,
  hasVideo: replayEmbedUrl(replay.videoUrl) !== null,
  downloads: (replay.attachments || []).length,
  published: Boolean(replay.published),
})

export const listReplays = async ({ moderator = false }: { moderator?: boolean } = {}): Promise<ReplayCard[]> => {
  try {
    const p = await payload()
    const { docs } = await p.find({
      collection: 'replays',
      where: moderator ? {} : { published: { equals: true } },
      sort: ['-recordedAt', '-createdAt'],
      limit: 200,
      depth: 0,
      overrideAccess: true,
    })
    return docs.map(toCard)
  } catch (err) {
    console.error('replays: could not list', err)
    return []
  }
}

export const getReplay = async (
  slug: string,
  { moderator = false }: { moderator?: boolean } = {},
): Promise<ReplayView | null> => {
  try {
    const p = await payload()
    const { docs } = await p.find({
      collection: 'replays',
      where: moderator
        ? { slug: { equals: slug } }
        : { and: [{ slug: { equals: slug } }, { published: { equals: true } }] },
      limit: 1,
      depth: 1,
      overrideAccess: true,
    })
    const replay = docs[0] as Replay | undefined
    if (!replay) return null

    const downloads: ReplayDownload[] = (replay.attachments || [])
      .map((row) => ({ label: row.label, file: typeof row.file === 'object' ? (row.file as ReplayFile) : null }))
      .filter((row): row is { label: string; file: ReplayFile } => Boolean(row.file?.url))
      .map((row) => ({
        label: row.label,
        url: pathOf(row.file.url as string),
        filename: row.file.filename || '',
        size: humanSize(row.file.filesize),
      }))

    const thread = typeof replay.thread === 'object' && replay.thread ? (replay.thread as Thread) : null

    return {
      card: toCard(replay),
      embed: replayEmbedUrl(replay.videoUrl),
      notes: replay.notes,
      downloads,
      thread: thread?.slug ? { slug: thread.slug, title: thread.title } : null,
    }
  } catch (err) {
    console.error('replays: could not load', err)
    return null
  }
}
