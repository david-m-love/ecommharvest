import { NextResponse } from 'next/server'

import { isAdmin } from '@/lib/access'
import { getCurrentUser } from '@/lib/auth'
import { payload } from '@/lib/entitlements'
import { getVideoProvider, VideoProviderError } from '@/lib/video'

/**
 * POST /api/admin/upload  { lessonId }
 *   Mints a one-time direct-upload URL and marks the lesson as uploading.
 *   The browser PUTs the file straight to the provider, so a 2GB video never
 *   passes through a serverless function with a 10s limit.
 *
 * GET /api/admin/upload?lessonId=…
 *   Polls the provider for encoding status and writes it back to the lesson.
 *   Called by the admin UI until the status settles.
 */

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { lessonId?: string | number }
  if (!body.lessonId) {
    return NextResponse.json({ error: 'lessonId is required' }, { status: 400 })
  }

  const p = await payload()
  const lesson = await p
    .findByID({ collection: 'lessons', id: body.lessonId, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  const provider = getVideoProvider()
  try {
    const upload = await provider.createDirectUpload({
      name: `${lesson.title} (lesson ${lesson.id})`,
    })

    // Replacing a video? Clean up the old one so we stop paying to store it.
    if (lesson.videoId && lesson.videoId !== upload.videoId) {
      await provider.deleteVideo(lesson.videoId).catch((err) => {
        console.error('upload: could not delete replaced video', lesson.videoId, err)
      })
    }

    await p.update({
      collection: 'lessons',
      id: lesson.id,
      data: { videoId: upload.videoId, videoStatus: 'uploading', durationSeconds: null },
      overrideAccess: true,
    })

    return NextResponse.json(
      { uploadUrl: upload.uploadUrl, videoId: upload.videoId },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    if (err instanceof VideoProviderError) {
      return NextResponse.json({ error: err.message }, { status: 503 })
    }
    throw err
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lessonId = new URL(request.url).searchParams.get('lessonId')
  if (!lessonId) {
    return NextResponse.json({ error: 'lessonId is required' }, { status: 400 })
  }

  const p = await payload()
  const lesson = await p
    .findByID({ collection: 'lessons', id: lessonId, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }
  if (!lesson.videoId) {
    return NextResponse.json({ status: 'none' })
  }

  const provider = getVideoProvider()
  try {
    const details = await provider.getVideo(lesson.videoId)

    // Only write when something changed, to avoid a needless version row on
    // every poll of a collection that has drafts enabled.
    if (details.status !== lesson.videoStatus || details.durationSeconds !== lesson.durationSeconds) {
      await p.update({
        collection: 'lessons',
        id: lesson.id,
        data: {
          videoStatus: details.status,
          durationSeconds: details.durationSeconds ?? lesson.durationSeconds ?? null,
        },
        overrideAccess: true,
      })
    }

    return NextResponse.json(
      {
        status: details.status,
        durationSeconds: details.durationSeconds,
        errorReason: details.errorReason,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    if (err instanceof VideoProviderError) {
      return NextResponse.json({ error: err.message }, { status: 503 })
    }
    throw err
  }
}
