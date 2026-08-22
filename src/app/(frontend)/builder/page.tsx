import Link from 'next/link'
import React from 'react'

import { requireCapability } from '@/lib/auth'
/**
 * Some pages live at their own URLs rather than under /p/, so the list has to
 * show where they actually are — otherwise the View button sends you to a
 * redirect and the path shown is wrong. One shared map, so this cannot drift
 * from what the editor and the redirects believe.
 */
import { publicPathFor as pathFor } from '@/lib/builder-page'
import { can } from '@/lib/capabilities'
import { payload } from '@/lib/entitlements'

export const metadata = { title: 'Pages' }
export const dynamic = 'force-dynamic'

/**
 * The page builder's front door: what exists, what is live, and a way to start
 * a new one.
 *
 * Deliberately a plain list. The interesting screen is the canvas; this one's
 * only job is to get out of the way in one click.
 */
export default async function BuilderIndex() {
  const user = await requireCapability('pages:write', '/builder')
  const p = await payload()

  const { docs: pages } = await p.find({
    collection: 'pages',
    depth: 0,
    limit: 200,
    sort: '-updatedAt',
    overrideAccess: false,
    user,
  })

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <Link href="/admin" className="brand" aria-label="Admin">
            <strong style={{ fontSize: 16, letterSpacing: '-0.02em' }}>eCommHarvest</strong>
          </Link>
          <div className="topbar-right">
            <span className="stamp">{user.email}</span>
          </div>
        </div>
      </header>

      <main className="slot">
        <div className="slot-in">
          <p className="eyebrow">Site</p>
          <h1>Pages</h1>
          <p className="lede">
            Pages you build here live on this site. Link their buttons wherever you like —
            including straight into a GoHighLevel funnel step.
          </p>

          <form action="/api/builder/new" method="post" className="cta-row">
            <button type="submit" className="btn">
              New page
            </button>
            <span className="cta-micro">Starts from a hero, hosted-by bar, CTA and footer.</span>
          </form>

          {pages.length === 0 ? (
            <p className="plus" style={{ marginTop: 34 }}>
              <strong>Nothing here yet.</strong> Create a page and it opens straight into the
              builder.
            </p>
          ) : (
            <div className="cols-1" style={{ marginTop: 34 }}>
              {pages.map((page) => (
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
                        {page.status === 'published' ? 'Live' : 'Draft — only your team can see it'}
                      </p>
                    </div>
                    <div className="cta-row" style={{ gap: 12 }}>
                      <Link className="btn" href={`/builder/${page.id}`}>
                        Edit
                      </Link>
                      {page.status === 'published' ? (
                        <Link className="btn btn-ghost" href={pathFor(page.slug)}>
                          View
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {can(user, 'pages:publish') ? null : (
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
