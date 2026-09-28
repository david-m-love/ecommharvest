import { NextResponse } from 'next/server'

import { done, failed, readBody } from '../_respond'
import { COMMUNITY_PATH } from '@/lib/community'
import { validateDisplayName } from '@/lib/community-input'
import { getCurrentUser } from '@/lib/auth'
import { payload } from '@/lib/entitlements'

/**
 * POST /api/community/profile  { displayName }
 *
 * The whole profile: what to call this person. No bio, no avatar, no links —
 * the room is a place to ask a question and get an answer, and a profile that
 * needs filling in is one more thing standing between somebody and their first
 * post.
 *
 * Writes only to the signed-in user's own row, with the id taken from the
 * session, so this endpoint cannot rename anybody else whatever is posted to it.
 */
export async function POST(request: Request) {
  const { body, wantsJson } = await readBody(request)
  const back = `${COMMUNITY_PATH}/profile`

  const user = await getCurrentUser()
  if (!user) return failed(request, wantsJson, '/login', 'Please sign in.', 401)

  const valid = validateDisplayName(body.displayName)
  if (!valid.ok) return failed(request, wantsJson, back, valid.error, 422)

  try {
    const p = await payload()
    await p.update({
      collection: 'users',
      id: user.id,
      data: { displayName: valid.value.displayName },
      overrideAccess: true,
    })
    const next = body.next && body.next.startsWith('/') && !body.next.startsWith('//')
      ? body.next
      : COMMUNITY_PATH
    return done(request, wantsJson, next)
  } catch (err) {
    console.error('community: could not save display name', err)
    return failed(request, wantsJson, back, 'Could not save that. Please try again.', 500)
  }
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
