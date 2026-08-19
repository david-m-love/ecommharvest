import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { getLessonContext, hasCourseAccess, payload } from '@/lib/entitlements'

/**
 * POST /api/progress  { lessonSlug, positionSeconds?, completed? }
 *
 * The `user` on the row is always taken from the session, never from the
 * request body, so a member cannot write progress for someone else.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    lessonSlug?: string
    positionSeconds?: number
    completed?: boolean
  }
  if (!body.lessonSlug) {
    return NextResponse.json({ error: 'lessonSlug is required' }, { status: 400 })
  }

  const context = await getLessonContext(body.lessonSlug)
  if (!context) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

  // No entitlement, no progress — otherwise progress becomes a way to probe
  // which lessons exist behind the paywall.
  if (!context.lesson.isPreview && !(await hasCourseAccess(user, context.course.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const p = await payload()
  const existing = await p.find({
    collection: 'progress',
    where: {
      and: [{ user: { equals: user.id } }, { lesson: { equals: context.lesson.id } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const position =
    typeof body.positionSeconds === 'number' && body.positionSeconds >= 0
      ? Math.floor(body.positionSeconds)
      : undefined

  const data: Record<string, unknown> = {
    user: user.id,
    lesson: context.lesson.id,
    course: context.course.id,
  }
  if (position !== undefined) data.lastPositionSeconds = position
  if (body.completed === true) data.completedAt = new Date().toISOString()
  if (body.completed === false) data.completedAt = null

  const saved = existing.docs.length
    ? await p.update({
        collection: 'progress',
        id: existing.docs[0].id,
        data,
        overrideAccess: true,
      })
    : await p.create({ collection: 'progress', data: data as never, overrideAccess: true })

  return NextResponse.json(
    { ok: true, completedAt: saved.completedAt, lastPositionSeconds: saved.lastPositionSeconds },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
