import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { payload } from '@/lib/entitlements'

/**
 * PUT /api/builder/[id]  { content: PuckData, publish?: boolean }
 *
 * Saves a layout from the builder.
 *
 * Two capabilities, checked separately, because they are different decisions:
 * `pages:write` saves, `pages:publish` makes it live. A contractor can be given
 * the first without the second, and the request is rejected — not silently
 * downgraded — if they ask for the second. Silently ignoring the publish flag
 * would leave them believing the page is live.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user || !can(user, 'pages:write')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const numericId = Number(id)
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: 'Bad page id' }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as {
    content?: unknown
    publish?: boolean
  } | null

  if (!body || typeof body.content !== 'object' || body.content === null) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  /**
   * Shape check before it reaches the database. Puck data is `{ content: [], root: {} }`;
   * anything else renders as an error page, and a page that cannot render is
   * worse than a rejected save.
   */
  const content = body.content as { content?: unknown }
  if (!Array.isArray(content.content)) {
    return NextResponse.json(
      { error: 'That does not look like a page layout. Nothing was saved.' },
      { status: 400 },
    )
  }

  if (body.publish && !can(user, 'pages:publish')) {
    return NextResponse.json(
      { error: 'You can save drafts but not publish. Ask an admin to publish this.' },
      { status: 403 },
    )
  }

  const p = await payload()

  try {
    const updated = await p.update({
      collection: 'pages',
      id: numericId,
      data: {
        content: body.content,
        ...(body.publish ? { status: 'published' as const } : {}),
      },
      // Run the collection's own access rules rather than trusting the checks
      // above to be complete. Two independent gates, deliberately.
      overrideAccess: false,
      user,
    })
    return NextResponse.json({ ok: true, status: updated.status })
  } catch (err) {
    console.error('builder: save failed', err)
    return NextResponse.json({ error: 'Could not save that page.' }, { status: 400 })
  }
}
