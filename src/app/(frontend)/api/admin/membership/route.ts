import { NextResponse } from 'next/server'

import { isAdmin } from '@/lib/access'
import { getCurrentUser } from '@/lib/auth'
import {
  cancelMembershipAtPeriodEnd,
  grantMembership,
  revokeMembership,
} from '@/lib/entitlements'

/**
 * POST /api/admin/membership  { userId, action: 'grant' | 'cancel' | 'revoke' | 'resume' }
 *
 * Membership changes from the members screen, keeping the distinction this
 * whole feature is built on intact at the point somebody actually clicks
 * something:
 *
 *   - **grant** starts or restores a membership, with no end date. Phase 1
 *     grants are made by hand for people who have already paid; a 30-day expiry
 *     with no webhook to renew it would quietly lock out a paying member.
 *   - **cancel** sets the end of the paid period and nothing else. They keep
 *     what they bought until the date they bought it through.
 *   - **revoke** cuts access off now. Refunds, chargebacks, removal.
 *   - **resume** un-cancels — clears the end date, for the ordinary case of
 *     somebody changing their mind before it runs out.
 *
 * Cancel and revoke are two buttons rather than one for exactly one reason: a
 * single "remove" button makes every cancellation a removal, and somebody who
 * paid for the month finds the room gone the same afternoon.
 *
 * The audit trail is written by the Entitlements collection hooks, so it covers
 * this route without the route having to remember to log anything.
 */
export async function POST(request: Request) {
  const actor = await getCurrentUser()
  if (!actor || !isAdmin(actor)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contentType = request.headers.get('content-type') || ''
  let body: { userId?: string | number; action?: string; periodEnd?: string } = {}

  if (contentType.includes('application/json')) {
    body = (await request.json().catch(() => ({}))) as typeof body
  } else {
    const form = await request.formData().catch(() => null)
    body = {
      userId: (form?.get('userId') as string) || undefined,
      action: (form?.get('action') as string) || undefined,
      periodEnd: (form?.get('periodEnd') as string) || undefined,
    }
  }

  const { userId, action } = body
  const allowed = ['grant', 'cancel', 'revoke', 'resume']
  if (!userId || !action || !allowed.includes(action)) {
    return NextResponse.json(
      { error: `userId and action (${allowed.join('|')}) are required` },
      { status: 400 },
    )
  }

  try {
    if (action === 'grant' || action === 'resume') {
      await grantMembership({
        userId,
        source: 'manual',
        sourceReference: `${action === 'resume' ? 'resumed' : 'granted'} by ${actor.email}`,
        actor,
      })
    } else if (action === 'cancel') {
      await cancelMembershipAtPeriodEnd({ userId, periodEnd: body.periodEnd, actor })
    } else {
      await revokeMembership({ userId, actor })
    }
  } catch (err) {
    console.error('admin/membership: failed', err)
    return NextResponse.json({ error: 'Could not change the membership.' }, { status: 400 })
  }

  if (!contentType.includes('application/json')) {
    return NextResponse.redirect(new URL('/members', new URL(request.url).origin), 303)
  }
  return NextResponse.json({ ok: true })
}
