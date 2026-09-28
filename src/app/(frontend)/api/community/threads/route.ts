import { NextResponse } from 'next/server'

import { done, failed, readBody } from '../_respond'
import { COMMUNITY_PATH, threadPath } from '@/lib/community'
import { validateThread } from '@/lib/community-input'
import { getCurrentUser } from '@/lib/auth'
import { hasMembership, payload } from '@/lib/entitlements'
import { withinLimit } from '@/lib/rate-limit'

/**
 * POST /api/community/threads  { title, body }
 *
 * Posts a question. `author` comes from the session and never from the request
 * body — the guarantee `Progress` and `/api/progress` established, and the
 * reason a forged author field is impossible here by construction rather than
 * by a validation rule somebody could forget to write.
 */

/** Five questions an hour. Enough for a busy day, not enough to flood the room. */
const LIMIT = { max: 5, windowMs: 60 * 60 * 1000 }

export async function POST(request: Request) {
  const { body, wantsJson } = await readBody(request)
  const back = `${COMMUNITY_PATH}/new`

  const user = await getCurrentUser()
  if (!user) return failed(request, wantsJson, '/login', 'Please sign in.', 401)

  // Membership, not a session. Everyone who ever asked for a sign-in link has
  // an account; only some of them have paid.
  if (!(await hasMembership(user))) {
    return failed(request, wantsJson, COMMUNITY_PATH, 'Your membership is not active.', 403)
  }

  const valid = validateThread(body)
  if (!valid.ok) return failed(request, wantsJson, back, valid.error, 422)

  if (!(await withinLimit({ bucket: 'community-thread', subject: user.id, ...LIMIT, failOpen: true }))) {
    return failed(
      request,
      wantsJson,
      back,
      'That is a lot of questions at once. Try again in an hour.',
      429,
    )
  }

  try {
    const p = await payload()
    const thread = await p.create({
      collection: 'threads',
      overrideAccess: true,
      data: {
        title: valid.value.title,
        body: valid.value.body,
        author: user.id,
        // Not read from the request under any circumstances: pinning is how the
        // weekly call sits at the top of the room.
        pinned: false,
      },
    })
    return done(request, wantsJson, threadPath(thread.slug || ''), { id: thread.id })
  } catch (err) {
    console.error('community: could not post thread', err)
    return failed(request, wantsJson, back, 'Could not post that. Please try again.', 500)
  }
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
