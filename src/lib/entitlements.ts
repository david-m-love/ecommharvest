import { getPayload } from 'payload'
import config from '@payload-config'

import type { Course, Lesson, Module, User } from '@/payload-types'
import { isAdmin } from '@/lib/access'

/**
 * The one function that decides whether someone may watch paid content.
 *
 * Kept out of Payload's collection access rules on purpose: a course's title
 * and lesson list are public (they are the sales page), so read access is open.
 * What is gated is *playback*, and that gate is here.
 */

export const payload = async () => getPayload({ config })

const idOf = (value: unknown): string | number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return (value as { id?: string | number }).id ?? null
  return value as string | number
}

/**
 * The Postgres adapter uses integer ids, but ids reaching us from URL params
 * are strings. Coerce once here so writes type-check and a malformed id fails
 * loudly rather than silently querying for NaN.
 */
const numericId = (value: string | number): number => {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(n)) throw new Error(`Expected a numeric id, received: ${String(value)}`)
  return n
}

/**
 * True when the user may play videos from this course.
 *
 * An entitlement counts only if it is not revoked and not expired. Admins pass
 * unconditionally so they can review content without granting themselves rows.
 */
export const hasCourseAccess = async (
  user: User | null,
  courseId: string | number,
): Promise<boolean> => {
  if (!user) return false
  if (isAdmin(user)) return true

  const p = await payload()
  const now = new Date().toISOString()

  const result = await p.find({
    collection: 'entitlements',
    limit: 1,
    depth: 0,
    overrideAccess: true, // the rule below *is* the check; don't double-filter
    where: {
      and: [
        { user: { equals: user.id } },
        { course: { equals: courseId } },
        { revokedAt: { exists: false } },
        {
          or: [{ expiresAt: { exists: false } }, { expiresAt: { greater_than: now } }],
        },
      ],
    },
  })

  return result.totalDocs > 0
}

/** Every course id the user may play, for rendering lock state on a listing. */
export const accessibleCourseIds = async (user: User | null): Promise<Set<string>> => {
  if (!user) return new Set()
  const p = await payload()

  if (isAdmin(user)) {
    const all = await p.find({ collection: 'courses', limit: 1000, depth: 0, overrideAccess: true })
    return new Set(all.docs.map((c) => String(c.id)))
  }

  const now = new Date().toISOString()
  const result = await p.find({
    collection: 'entitlements',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    where: {
      and: [
        { user: { equals: user.id } },
        { revokedAt: { exists: false } },
        { or: [{ expiresAt: { exists: false } }, { expiresAt: { greater_than: now } }] },
      ],
    },
  })
  return new Set(result.docs.map((e) => String(idOf(e.course))).filter(Boolean))
}

/**
 * Grant access. Reuses an existing live entitlement rather than stacking
 * duplicates, and un-revokes a previously revoked one so re-granting after a
 * mistaken revoke does the obvious thing.
 */
export const grantAccess = async (args: {
  userId: string | number
  courseId: string | number
  source?: 'manual' | 'stripe' | 'shopify' | 'masterclass'
  sourceReference?: string
  expiresAt?: string | null
}) => {
  const p = await payload()
  const existing = await p.find({
    collection: 'entitlements',
    limit: 1,
    depth: 0,
    overrideAccess: true,
    where: {
      and: [{ user: { equals: args.userId } }, { course: { equals: args.courseId } }],
    },
  })

  const data = {
    user: numericId(args.userId),
    course: numericId(args.courseId),
    source: args.source || ('manual' as const),
    sourceReference: args.sourceReference,
    grantedAt: new Date().toISOString(),
    expiresAt: args.expiresAt ?? null,
    revokedAt: null,
  }

  if (existing.docs.length) {
    return p.update({
      collection: 'entitlements',
      id: existing.docs[0].id,
      data,
      overrideAccess: true,
    })
  }
  return p.create({ collection: 'entitlements', data, overrideAccess: true })
}

/**
 * Revoke access by stamping revokedAt rather than deleting, so the history
 * survives a refund dispute or a "why did I lose access" support thread.
 */
export const revokeAccess = async (args: {
  userId: string | number
  courseId: string | number
}) => {
  const p = await payload()
  const existing = await p.find({
    collection: 'entitlements',
    limit: 10,
    depth: 0,
    overrideAccess: true,
    where: {
      and: [
        { user: { equals: args.userId } },
        { course: { equals: args.courseId } },
        { revokedAt: { exists: false } },
      ],
    },
  })

  await Promise.all(
    existing.docs.map((doc) =>
      p.update({
        collection: 'entitlements',
        id: doc.id,
        data: { revokedAt: new Date().toISOString() },
        overrideAccess: true,
      }),
    ),
  )
  return existing.docs.length
}

// --- Course tree ---------------------------------------------------------

export type LessonNode = Pick<
  Lesson,
  'id' | 'title' | 'slug' | 'isPreview' | 'videoStatus' | 'durationSeconds'
>
export type ModuleNode = { id: string | number; title: string; summary?: string | null; lessons: LessonNode[] }
export type CourseTree = { course: Course; modules: ModuleNode[] }

/**
 * Loads a published course with its modules and lessons in display order.
 *
 * Three queries rather than N+1: the course, all its modules, then all lessons
 * for those modules in one go.
 */
export const getCourseTree = async (slug: string): Promise<CourseTree | null> => {
  const p = await payload()

  const courses = await p.find({
    collection: 'courses',
    where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  const course = courses.docs[0]
  if (!course) return null

  const modules = await p.find({
    collection: 'modules',
    where: { and: [{ course: { equals: course.id } }, { _status: { equals: 'published' } }] },
    limit: 200,
    depth: 0,
    sort: '_order',
    overrideAccess: true,
  })
  if (!modules.docs.length) return { course, modules: [] }

  const lessons = await p.find({
    collection: 'lessons',
    where: {
      and: [
        { module: { in: modules.docs.map((m) => m.id) } },
        { _status: { equals: 'published' } },
      ],
    },
    limit: 1000,
    depth: 0,
    sort: '_order',
    overrideAccess: true,
  })

  const byModule = new Map<string, LessonNode[]>()
  for (const lesson of lessons.docs) {
    const key = String(idOf(lesson.module))
    if (!byModule.has(key)) byModule.set(key, [])
    byModule.get(key)!.push({
      id: lesson.id,
      title: lesson.title,
      slug: lesson.slug,
      isPreview: lesson.isPreview,
      videoStatus: lesson.videoStatus,
      durationSeconds: lesson.durationSeconds,
    })
  }

  return {
    course,
    modules: (modules.docs as Module[]).map((m) => ({
      id: m.id,
      title: m.title,
      summary: m.summary,
      lessons: byModule.get(String(m.id)) || [],
    })),
  }
}

/** Resolves a lesson slug to the lesson, its module, and its course. */
export const getLessonContext = async (lessonSlug: string) => {
  const p = await payload()
  const lessons = await p.find({
    collection: 'lessons',
    where: { and: [{ slug: { equals: lessonSlug } }, { _status: { equals: 'published' } }] },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  })
  const lesson = lessons.docs[0]
  if (!lesson) return null

  const mod = typeof lesson.module === 'object' ? (lesson.module as Module) : null
  if (!mod) return null
  const course = typeof mod.course === 'object' ? (mod.course as Course) : null
  if (!course) return null

  return { lesson, module: mod, course }
}
