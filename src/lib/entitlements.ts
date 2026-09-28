import { getPayload } from 'payload'
import config from '@payload-config'

import type { Course, Lesson, Module, User } from '@/payload-types'
import { isAdmin } from '@/lib/access'
import {
  type MembershipProduct,
  WEEKLY,
  liveEntitlement,
  liveMembershipWhere,
} from '@/lib/membership'

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

  const result = await p.find({
    collection: 'entitlements',
    limit: 1,
    depth: 0,
    overrideAccess: true, // the rule below *is* the check; don't double-filter
    where: {
      and: [
        { user: { equals: user.id } },
        { course: { equals: courseId } },
        ...liveEntitlement(new Date().toISOString()),
      ],
    },
  })

  return result.totalDocs > 0
}

// --- Memberships ---------------------------------------------------------

export { WEEKLY, type MembershipProduct } from '@/lib/membership'

/**
 * True when this person is a paid-up member of the community.
 *
 * The community gates on this and never on `user.roles`. Everyone who has ever
 * asked for a sign-in link has `roles: ['member']` — the masterclass flow
 * creates accounts on demand — so a role check would put the entire
 * registration list in a room that is meant to be a paid one.
 */
export const hasMembership = async (
  user: User | null,
  product: MembershipProduct = WEEKLY,
): Promise<boolean> => {
  if (!user) return false
  if (isAdmin(user)) return true

  const p = await payload()
  const result = await p.find({
    collection: 'entitlements',
    limit: 1,
    depth: 0,
    overrideAccess: true, // the where clause below *is* the check
    where: liveMembershipWhere(user.id, product),
  })
  return result.totalDocs > 0
}

/** The live membership row, when there is one. Null for admins without one. */
export const findMembership = async (
  userId: string | number,
  product: MembershipProduct = WEEKLY,
) => {
  const p = await payload()
  const { docs } = await p.find({
    collection: 'entitlements',
    limit: 1,
    depth: 0,
    overrideAccess: true,
    where: { and: [{ user: { equals: userId } }, { product: { equals: product } }] },
    sort: '-grantedAt',
  })
  return docs[0] ?? null
}

/**
 * Start or restore a membership.
 *
 * Reuses the existing row rather than stacking duplicates, and clears both
 * `revokedAt` and `expiresAt` — re-granting after a mistaken revoke, or after a
 * cancellation the member changed their mind about, should do the obvious
 * thing rather than leave a date ticking.
 *
 * `expiresAt` is left open by default because Phase 1 grants are made by hand
 * for people who have already paid, and a silent lapse in 30 days with no
 * webhook to renew it would lock out a paying member. When the payment webhook
 * lands it will pass an explicit date on every renewal, which is what makes a
 * missed event self-healing.
 */
export const grantMembership = async (args: {
  userId: string | number
  product?: MembershipProduct
  source?: 'manual' | 'stripe' | 'shopify' | 'masterclass'
  sourceReference?: string
  expiresAt?: string | null
  /**
   * Who is doing this, so the audit log can say.
   *
   * Passed to the local API as `user`, which is what puts `req.user` in front
   * of the audit hook. Without it every membership change is recorded with a
   * blank actor — and "who removed this member" is exactly the question an
   * audit log exists to answer. Left optional because the payment webhook in
   * Phase 2 will have no human behind it, and a blank actor is the honest
   * answer there.
   */
  actor?: User | null
}) => {
  const p = await payload()
  const product = args.product || WEEKLY
  const existing = await findMembership(args.userId, product)

  const data = {
    user: numericId(args.userId),
    product,
    source: args.source || ('manual' as const),
    sourceReference: args.sourceReference,
    grantedAt: new Date().toISOString(),
    expiresAt: args.expiresAt ?? null,
    revokedAt: null,
  }

  if (existing) {
    return p.update({
      collection: 'entitlements',
      id: existing.id,
      data,
      overrideAccess: true,
      user: args.actor ?? undefined,
    })
  }
  return p.create({
    collection: 'entitlements',
    data,
    overrideAccess: true,
    user: args.actor ?? undefined,
  })
}

/** How long a cancelled membership runs on for when no billing date is known. */
export const DEFAULT_PERIOD_DAYS = 30

/**
 * Cancel at the end of the paid period.
 *
 * Sets `expiresAt` and deliberately does **not** touch `revokedAt`. Somebody
 * who cancels three days into a month they have paid for keeps the room for the
 * rest of it; taking it away the moment they click cancel is charging for
 * twenty-seven days of nothing.
 *
 * Returns the date access ends, so the caller can say it out loud.
 */
export const cancelMembershipAtPeriodEnd = async (args: {
  userId: string | number
  product?: MembershipProduct
  /** When the paid period actually ends. Defaults to 30 days out. */
  periodEnd?: string
  actor?: User | null
}): Promise<string | null> => {
  const p = await payload()
  const existing = await findMembership(args.userId, args.product || WEEKLY)
  if (!existing || existing.revokedAt) return null

  const periodEnd =
    args.periodEnd ||
    new Date(Date.now() + DEFAULT_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString()

  await p.update({
    collection: 'entitlements',
    id: existing.id,
    data: { expiresAt: periodEnd },
    overrideAccess: true,
    user: args.actor ?? undefined,
  })
  return periodEnd
}

/**
 * End a membership now: a refund, a chargeback, or somebody being removed.
 *
 * Stamps `revokedAt` rather than deleting, so the history survives the dispute
 * that usually prompts it. Distinct from cancelling on purpose — see above.
 */
export const revokeMembership = async (args: {
  userId: string | number
  product?: MembershipProduct
  actor?: User | null
}): Promise<number> => {
  const p = await payload()
  const product = args.product || WEEKLY
  const { docs } = await p.find({
    collection: 'entitlements',
    limit: 10,
    depth: 0,
    overrideAccess: true,
    where: {
      and: [
        { user: { equals: args.userId } },
        { product: { equals: product } },
        { revokedAt: { exists: false } },
      ],
    },
  })

  await Promise.all(
    docs.map((doc) =>
      p.update({
        collection: 'entitlements',
        id: doc.id,
        data: { revokedAt: new Date().toISOString() },
        overrideAccess: true,
        user: args.actor ?? undefined,
      }),
    ),
  )
  return docs.length
}

/** Every course id the user may play, for rendering lock state on a listing. */
export const accessibleCourseIds = async (user: User | null): Promise<Set<string>> => {
  if (!user) return new Set()
  const p = await payload()

  if (isAdmin(user)) {
    const all = await p.find({ collection: 'courses', limit: 1000, depth: 0, overrideAccess: true })
    return new Set(all.docs.map((c) => String(c.id)))
  }

  const result = await p.find({
    collection: 'entitlements',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    where: {
      and: [{ user: { equals: user.id } }, ...liveEntitlement(new Date().toISOString())],
    },
  })
  /**
   * `idOf` first, then a null check — not `.filter(Boolean)` on the stringified
   * id. Membership rows live in this table too and carry no course, and
   * `String(null)` is the truthy string "null", so stringifying first would
   * quietly put a course called "null" in everybody's unlocked set.
   */
  return new Set(
    result.docs
      .map((e) => idOf(e.course))
      .filter((id): id is string | number => id !== null)
      .map(String),
  )
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
