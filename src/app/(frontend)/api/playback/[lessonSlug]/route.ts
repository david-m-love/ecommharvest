import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { getLessonContext, hasCourseAccess } from '@/lib/entitlements'
import { getVideoProvider, VideoProviderError } from '@/lib/video'

/**
 * GET /api/playback/:lessonSlug
 *
 * The gate. Returns a short-lived signed playback token only after confirming
 * the caller is entitled to the lesson's course. Never returns a raw, permanent
 * video URL, so a copied link stops working instead of becoming a share link.
 */

// Long enough to watch a lesson and scrub around, short enough that a leaked
// URL is worthless tomorrow. The player refetches when it expires.
const TOKEN_TTL_SECONDS = 60 * 60 * 4

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lessonSlug: string }> },
) {
  // Next 16: route params are a promise.
  const { lessonSlug } = await params

  const context = await getLessonContext(lessonSlug)
  if (!context) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }
  const { lesson, course } = context

  if (!lesson.videoId || lesson.videoStatus !== 'ready') {
    return NextResponse.json(
      { error: 'This lesson has no playable video yet.', status: lesson.videoStatus },
      { status: 409 },
    )
  }

  // Preview lessons are the teaser, playable without an entitlement — but still
  // signed, so the URL expires like any other.
  if (!lesson.isPreview) {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in to watch this lesson.' }, { status: 401 })
    }
    const allowed = await hasCourseAccess(user, course.id)
    if (!allowed) {
      return NextResponse.json(
        { error: 'You do not have access to this course.' },
        { status: 403 },
      )
    }
  }

  const provider = getVideoProvider()
  try {
    const token = await provider.createPlaybackToken(lesson.videoId, TOKEN_TTL_SECONDS)
    return NextResponse.json(
      {
        playbackUrl: provider.playbackUrl(lesson.videoId, token),
        thumbnailUrl: provider.thumbnailUrl(lesson.videoId, token),
        expiresInSeconds: TOKEN_TTL_SECONDS,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    if (err instanceof VideoProviderError) {
      console.error('playback: provider error', err.message)
      return NextResponse.json({ error: err.message }, { status: 503 })
    }
    throw err
  }
}
