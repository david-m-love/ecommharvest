import { NextResponse } from 'next/server'

import { done, failed, readBody } from '../_respond'
import { COMMUNITY_PATH, threadPath } from '@/lib/community'
import { validateReply } from '@/lib/community-input'
import { getCurrentUser } from '@/lib/auth'
import { hasMembership, payload } from '@/lib/entitlements'
import { withinLimit } from '@/lib/rate-limit'

/**
 * POST /api/community/replies  { slug, body }
 *
 * Answers a question. Takes the thread's slug rather than its id so the form on
 * the page has nothing in it that needs looking up, and so a redirect back to
 * the thread needs no second query.
 */

/** Thirty replies an hour. A generous morning of answering, and no more. */
const LIMIT = { max: 30, windowMs: 60 * 60 * 1000 }

export async function POST(request: Request) {
  const { body, wantsJson } = await readBody(request)
  const slug = (body.slug || '').trim()
  const back = slug ? threadPath(slug) : COMMUNITY_PATH

  const user = await getCurrentUser()
  if (!user) return failed(request, wantsJson, '/login', 'Please sign in.', 401)

  if (!(await hasMembership(user))) {
    return failed(request, wantsJson, COMMUNITY_PATH, 'Your membership is not active.', 403)
  }

  const valid = validateReply(body)
  if (!valid.ok) return failed(request, wantsJson, back, valid.error, 422)

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

    /**
     * Locked is checked here, on the server, and not only by hiding the box.
     *
     * A lock that lives in the template is a lock anybody can post through with
     * one line of `fetch`, and the moment a thread is locked is exactly the
     * moment somebody wants to.
     */
    if (thread.lockedAt) {
      return failed(request, wantsJson, back, 'This thread is closed to new replies.', 403)
    }

    if (!(await withinLimit({ bucket: 'community-reply', subject: user.id, ...LIMIT, failOpen: true }))) {
      return failed(request, wantsJson, back, 'Slow down a moment — try again shortly.', 429)
    }

    await p.create({
      collection: 'replies',
      overrideAccess: true,
      data: { thread: thread.id, body: valid.value.body, author: user.id },
    })
    // Straight to the newest reply, which is the thing they just wrote.
    return done(request, wantsJson, `${back}#latest`)
  } catch (err) {
    console.error('community: could not post reply', err)
    return failed(request, wantsJson, back, 'Could not post that. Please try again.', 500)
  }
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
