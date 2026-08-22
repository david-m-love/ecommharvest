import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { payload } from '@/lib/entitlements'
import { OWN_ROUTES } from '@/lib/builder-page'
import { slugify } from '@/lib/slug'

/**
 * POST /api/builder/<id>/actions — duplicate or delete a page.
 *
 * Form posts rather than fetch, matching the "New page" button: the page list
 * works with no client-side JavaScript, and a 303 redirect means a refresh does
 * not repeat the action.
 *
 * The two operations are here together because they share every check — who you
 * are, whether the page exists, whether it is one of the four the site's routes
 * depend on — and splitting them would mean maintaining those checks twice.
 */

/**
 * Pages the site's own routes render. Deleting one does not just remove a page:
 * `/` or `/privacy` would start serving its fallback, or nothing, and the person
 * clicking Delete on a list has no way to know that. Duplicating them is fine.
 */
const PROTECTED = new Set(Object.keys(OWN_ROUTES))

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || !can(user, 'pages:write')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const numericId = Number(id)
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: 'Not a page id' }, { status: 400 })
  }

  const form = await request.formData().catch(() => null)
  const action = String(form?.get('action') || '')
  const origin = new URL(request.url).origin
  const back = (query = '') => NextResponse.redirect(`${origin}/builder${query}`, 303)

  const p = await payload()
  const page = await p
    .findByID({ collection: 'pages', id: numericId, depth: 0, overrideAccess: false, user })
    .catch(() => null)
  if (!page) return NextResponse.json({ error: 'No such page' }, { status: 404 })

  // --- duplicate ---------------------------------------------------------

  if (action === 'duplicate') {
    /**
     * A copy is always a draft, whatever the original was. Publishing is a
     * decision, and "duplicate" should never be the thing that puts a second
     * copy of a live page on the internet.
     */
    const base = slugify(`${page.slug}-copy`)
    let slug = base
    for (let n = 2; n < 200; n++) {
      const { totalDocs } = await p.count({ collection: 'pages', where: { slug: { equals: slug } } })
      if (totalDocs === 0) break
      slug = slugify(`${base}-${n}`)
    }

    const created = await p.create({
      collection: 'pages',
      data: {
        title: `${page.title} copy`,
        slug,
        seoTitle: page.seoTitle ?? undefined,
        description: page.description ?? undefined,
        noindex: page.noindex ?? undefined,
        content: page.content,
      },
      overrideAccess: false,
      user,
    })
    // Straight into the canvas: the point of duplicating is to change something.
    return NextResponse.redirect(`${origin}/builder/${created.id}`, 303)
  }

  // --- delete ------------------------------------------------------------

  if (action === 'delete') {
    if (PROTECTED.has(page.slug)) {
      return back(`?error=${encodeURIComponent(`"${page.title}" is one of the site's own pages and cannot be deleted. Unpublish it instead.`)}`)
    }
    /**
     * Deleting a published page takes a live URL off the internet, which is a
     * different act from tidying a draft — so it needs the same permission as
     * publishing one.
     */
    if (page.status === 'published' && !can(user, 'pages:publish')) {
      return back(`?error=${encodeURIComponent('That page is live. Only someone who can publish can delete it.')}`)
    }

    await p.delete({ collection: 'pages', id: numericId, overrideAccess: false, user })
    return back(`?deleted=${encodeURIComponent(page.title)}`)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
