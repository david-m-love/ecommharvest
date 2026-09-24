import Link from 'next/link'
import React from 'react'

import { SiteBar } from '@/components/SiteBar'
import { requireCapability } from '@/lib/auth'
/**
 * Some pages live at their own URLs rather than under /p/, so the list has to
 * show where they actually are — otherwise the View button sends you to a
 * redirect and the path shown is wrong. One shared map, so this cannot drift
 * from what the editor and the redirects believe.
 */
import { OWN_ROUTES, publicPathFor as pathFor } from '@/lib/builder-page'
import { can } from '@/lib/capabilities'
import { payload } from '@/lib/entitlements'

import { PageActions } from './PageActions'

export const metadata = { title: 'Pages' }
export const dynamic = 'force-dynamic'

/**
 * The page builder's front door: what exists, what is live, and what you can do
 * to each one.
 *
 * Still deliberately a plain list — the interesting screen is the canvas. But it
 * had only Edit and View, so a page created by mistake could not be removed
 * without going into the Payload admin, and building a second landing page from
 * one that works meant rebuilding it. Duplicate and Delete close both.
 */
export default async function BuilderIndex({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>
}) {
  const user = await requireCapability('pages:write', '/builder')
  const { deleted, error } = await searchParams
  const p = await payload()

  const { docs: pages } = await p.find({
    collection: 'pages',
    depth: 0,
    limit: 200,
    sort: '-updatedAt',
    overrideAccess: false,
    user,
  })

  const publisher = can(user, 'pages:publish')

  return (
    <>
      <SiteBar user={user} current="pages" />

      <main className="slot">
        <div className="slot-in">
          <p className="eyebrow">Site</p>
          <h1>Pages</h1>
          <p className="lede">
            Pages you build here live on this site. Link their buttons wherever you like —
            including straight into a GoHighLevel funnel step.
          </p>

          {/* Outcomes of the last action, since a redirect loses everything else. */}
          {deleted ? (
            <p className="flash flash-ok">Deleted “{deleted}”.</p>
          ) : null}
          {error ? <p className="flash flash-error">{error}</p> : null}

          <div className="cta-row">
            <form action="/api/builder/new" method="post">
              <button type="submit" className="btn">
                New page
              </button>
            </form>
            {/* Same editor, slide layouts instead of page sections — for
                something presented from the browser rather than scrolled. */}
            <form action="/api/builder/new" method="post">
              <input type="hidden" name="kind" value="deck" />
              <button type="submit" className="btn btn-ghost">
                New slide deck
              </button>
            </form>
            <span className="cta-micro">
              A page starts from a hero, CTA and footer. A deck starts from a title slide.
            </span>
          </div>

          {pages.length === 0 ? (
            <p className="plus" style={{ marginTop: 34 }}>
              <strong>Nothing here yet.</strong> Create a page and it opens straight into the
              builder.
            </p>
          ) : (
            <div className="cols-1" style={{ marginTop: 34 }}>
              {pages.map((page) => {
                const live = page.status === 'published'
                return (
                  <div className="card" key={page.id}>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 16,
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <h3 style={{ margin: '0 0 6px' }}>{page.title}</h3>
                        {/* .stamp, not .sp-role: the latter uppercases, which
                            turns a URL into something that looks wrong. */}
                        <p className="stamp" style={{ margin: 0 }}>
                          {pathFor(page.slug)} ·{' '}
                          {live ? 'Live' : 'Draft — only your team can see it'}
                        </p>
                      </div>
                      <div className="cta-row" style={{ gap: 12 }}>
                        <Link className="btn" href={`/builder/${page.id}`}>
                          Edit
                        </Link>
                        {/*
                          A draft has no public page, but it does have a preview
                          — and the preview is the thing worth looking at before
                          publishing. Labelled differently so the two are not
                          confused: "View" is what the world sees, "Preview" is
                          what only the team can.
                        */}
                        <Link
                          className="btn btn-ghost"
                          href={live ? pathFor(page.slug) : `/p/${page.slug}`}
                        >
                          {live ? 'View' : 'Preview'}
                        </Link>
                      </div>
                    </div>

                    {/* Renaming, the URL and the search headline all live on the
                        record, so this links to the one screen that owns them
                        rather than duplicating three fields here. */}
                    <div
                      className="cta-row"
                      style={{ gap: 14, marginTop: 18, alignItems: 'center' }}
                    >
                      <Link className="minibtn" href={`/admin/collections/pages/${page.id}`}>
                        Rename &amp; settings
                      </Link>
                      <PageActions
                        pageId={page.id}
                        title={page.title}
                        isPublished={live}
                        canPublish={publisher}
                        isProtected={Boolean(OWN_ROUTES[page.slug])}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {publisher ? null : (
            <p className="plus" style={{ marginTop: 34 }}>
              <strong>You can edit but not publish.</strong> Save as much as you like — an admin
              makes it live.
            </p>
          )}
        </div>
      </main>
    </>
  )
}
