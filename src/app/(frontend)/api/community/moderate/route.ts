import { NextResponse } from 'next/server'

import { done, failed, readBody } from '../_respond'
import { COMMUNITY_PATH, threadPath } from '@/lib/community'
import { isModeration } from '@/lib/community-input'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/access'
import { can } from '@/lib/capabilities'
import { payload } from '@/lib/entitlements'

/**
 * POST /api/community/moderate  { slug, action, replyId? }
 *
 * Pin, lock and remove — the whole moderation surface.
 *
 * There is no reporting queue and no edit history, because the room is small
 * and paid and everybody in it has a card on file. That is a stronger
 * moderation tool than any workflow, and the first thing worth building is the
 * ability to put the weekly call at the top and close a thread that has run its
 * course.
 */
export async function POST(request: Request) {
  const { body, wantsJson } = await readBody(request)
  const slug = (body.slug || '').trim()
  const back = slug ? threadPath(slug) : COMMUNITY_PATH

  const user = await getCurrentUser()
  // Deliberately the capability and not "is this your thread". Moderation is a
  // job, not a property of authorship.
  if (!user || !(isAdmin(user) || can(user, 'community:moderate'))) {
    return failed(request, wantsJson, COMMUNITY_PATH, 'Not allowed.', 403)
  }

  const action = body.action
  if (!isModeration(action)) {
    return failed(request, wantsJson, back, 'Unknown action.', 400)
  }

  try {
    const p = await payload()
    const { docs } = await p.find({
      collection: 'threads',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const thread = docs[0]
    if (!thread) return failed(request, wantsJson, COMMUNITY_PATH, 'That thread is gone.', 404)

    // Removing one reply rather than the thread, when the form names one.
    if (action === 'delete' && body.replyId) {
      await p.delete({ collection: 'replies', id: body.replyId, overrideAccess: true })
      return done(request, wantsJson, back)
    }

    if (action === 'delete') {
      /**
       * Replies first, then the thread. Payload does not cascade, and orphaned
       * replies would sit in the table pointing at nothing — invisible in the
       * room and returned forever by `/api/replies`.
       */
      const replies = await p.find({
        collection: 'replies',
        where: { thread: { equals: thread.id } },
        limit: 1000,
        depth: 0,
        overrideAccess: true,
      })
      for (const reply of replies.docs) {
        await p.delete({ collection: 'replies', id: reply.id, overrideAccess: true })
      }
      await p.delete({ collection: 'threads', id: thread.id, overrideAccess: true })
      return done(request, wantsJson, COMMUNITY_PATH)
    }

    const data =
      action === 'pin'
        ? { pinned: true }
        : action === 'unpin'
          ? { pinned: false }
          : action === 'lock'
            ? { lockedAt: new Date().toISOString() }
            : { lockedAt: null }

    await p.update({ collection: 'threads', id: thread.id, data, overrideAccess: true })
    return done(request, wantsJson, back)
  } catch (err) {
    console.error('community: moderation failed', err)
    return failed(request, wantsJson, back, 'Could not do that. Please try again.', 500)
  }
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
