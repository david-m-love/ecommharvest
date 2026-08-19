import { NextResponse } from 'next/server'

import { isAdmin } from '@/lib/access'
import { getCurrentUser } from '@/lib/auth'
import { grantAccess, revokeAccess } from '@/lib/entitlements'

/**
 * POST /api/admin/access  { userId, courseId, action: 'grant' | 'revoke' }
 *
 * One-click access changes for the members screen. The audit trail is written by
 * the Entitlements collection hooks, so it covers this route without it having
 * to remember to log anything.
 *
 * Accepts a form post as well as JSON so the members screen works without
 * client-side JavaScript.
 */
export async function POST(request: Request) {
  const actor = await getCurrentUser()
  if (!actor || !isAdmin(actor)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contentType = request.headers.get('content-type') || ''
  let body: { userId?: string | number; courseId?: string | number; action?: string } = {}

  if (contentType.includes('application/json')) {
    body = (await request.json().catch(() => ({}))) as typeof body
  } else {
    const form = await request.formData().catch(() => null)
    body = {
      userId: (form?.get('userId') as string) || undefined,
      courseId: (form?.get('courseId') as string) || undefined,
      action: (form?.get('action') as string) || undefined,
    }
  }

  const { userId, courseId, action } = body
  if (!userId || !courseId || (action !== 'grant' && action !== 'revoke')) {
    return NextResponse.json(
      { error: 'userId, courseId and action (grant|revoke) are required' },
      { status: 400 },
    )
  }

  try {
    if (action === 'grant') {
      await grantAccess({
        userId,
        courseId,
        source: 'manual',
        sourceReference: `granted by ${actor.email}`,
      })
    } else {
      await revokeAccess({ userId, courseId })
    }
  } catch (err) {
    console.error('admin/access: failed', err)
    return NextResponse.json({ error: 'Could not change access.' }, { status: 400 })
  }

  // Form posts get sent back to the screen they came from; JSON callers get JSON.
  if (!contentType.includes('application/json')) {
    return NextResponse.redirect(new URL('/members', new URL(request.url).origin), 303)
  }
  return NextResponse.json({ ok: true })
}
