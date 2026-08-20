import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { payload } from '@/lib/entitlements'
import { slugify } from '@/lib/slug'

/**
 * POST /api/builder/new
 *
 * Creates an untitled draft and sends the person straight into the canvas.
 *
 * A form post rather than fetch, so the button works with no client-side
 * JavaScript, and a 303 redirect so the browser follows with GET rather than
 * re-posting on refresh.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || !can(user, 'pages:write')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const p = await payload()
  const origin = new URL(request.url).origin

  /**
   * `slug` is unique, so "Untitled page" collides the second time. Rather than
   * surface a database error to someone who just clicked a button, find the
   * first free suffix.
   */
  const base = 'untitled-page'
  let slug = base
  for (let n = 2; n < 200; n++) {
    const { totalDocs } = await p.count({ collection: 'pages', where: { slug: { equals: slug } } })
    if (totalDocs === 0) break
    slug = slugify(`${base}-${n}`)
  }

  try {
    const created = await p.create({
      collection: 'pages',
      data: {
        title: 'Untitled page',
        slug,
        /**
         * `status` is deliberately not set here, even though 'draft' is what we
         * want. Writing it requires `pages:publish`, so sending it would either
         * be stripped or rejected for a write-only user — and creating a page
         * must not need permission to publish one. The field's own
         * `defaultValue: 'draft'` does the job, and it cannot default to live.
         */
        noindex: true,
      },
      overrideAccess: false,
      user,
    })
    return NextResponse.redirect(new URL(`/builder/${created.id}`, origin), 303)
  } catch (err) {
    console.error('builder/new: create failed', err)
    return NextResponse.redirect(new URL('/builder?error=create', origin), 303)
  }
}
