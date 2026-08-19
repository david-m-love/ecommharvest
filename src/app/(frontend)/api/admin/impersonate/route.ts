import { NextResponse } from 'next/server'

import { isAdmin } from '@/lib/access'
import { writeAudit } from '@/lib/audit'
import { getCurrentUser } from '@/lib/auth'
import { payload } from '@/lib/entitlements'
import { createSessionCookie } from '@/lib/session'
import type { User } from '@/payload-types'

/**
 * POST /api/admin/impersonate  { userId }
 *
 * Signs the caller in as a member so they can see exactly what that member
 * sees. Invaluable for "it says locked but I paid" support threads.
 *
 * Guardrails, because this is the most dangerous endpoint in the app:
 *  - admins only
 *  - never another admin, so it cannot be used to launder privilege
 *  - always audited, before the session is handed over
 *  - POST only, so no link or prefetch can trigger it
 *
 * Note the trade-off being accepted: this *replaces* the admin's own session
 * rather than stacking one, so returning to admin means signing back in. That
 * is deliberate — a "stop impersonating" mechanism means carrying the original
 * identity around in a second cookie, which is a much larger security surface
 * than a second sign-in is an inconvenience.
 */
export async function POST(request: Request) {
  const actor = await getCurrentUser()
  if (!actor || !isAdmin(actor)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contentType = request.headers.get('content-type') || ''
  let userId: string | number | undefined
  if (contentType.includes('application/json')) {
    userId = ((await request.json().catch(() => ({}))) as { userId?: string | number }).userId
  } else {
    const form = await request.formData().catch(() => null)
    const raw = form?.get('userId')
    userId = typeof raw === 'string' ? raw : undefined
  }

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const p = await payload()
  const target = (await p
    .findByID({ collection: 'users', id: userId, depth: 0, overrideAccess: true })
    .catch(() => null)) as User | null

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  if (isAdmin(target)) {
    return NextResponse.json(
      { error: 'Refusing to impersonate another admin.' },
      { status: 403 },
    )
  }

  // Audit before granting the session, so an interrupted request still leaves a
  // record of the attempt.
  await writeAudit(p, {
    action: 'admin.impersonated',
    actorId: actor.id,
    subject: `user:${target.id} (${target.email})`,
    detail: { actorEmail: actor.email },
    ip: request.headers.get('x-forwarded-for') || undefined,
  })

  const response = NextResponse.redirect(new URL('/learn', new URL(request.url).origin))
  response.headers.set('Set-Cookie', await createSessionCookie(target))
  return response
}
