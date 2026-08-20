import type { Data } from '@measured/puck'
import { notFound } from 'next/navigation'
import React from 'react'

import { requireCapability } from '@/lib/auth'
import { can } from '@/lib/capabilities'
import { payload } from '@/lib/entitlements'

import { Editor } from './Editor'

export const metadata = { title: 'Page builder' }

/**
 * The builder for one page.
 *
 * Gating happens here rather than in `proxy.ts` for the same reason the rest of
 * the app does it in the data layer: the check runs against the database on the
 * request that actually loads the content, so there is no window where a stale
 * edge decision lets someone through.
 */
export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireCapability('pages:write', `/builder/${id}`)

  const numericId = Number(id)
  if (!Number.isFinite(numericId)) notFound()

  const p = await payload()
  const page = await p
    .findByID({ collection: 'pages', id: numericId, depth: 0, overrideAccess: false, user })
    .catch(() => null)

  if (!page) notFound()

  return (
    <Editor
      pageId={numericId}
      title={page.title}
      slug={page.slug}
      status={page.status === 'published' ? 'published' : 'draft'}
      canPublish={can(user, 'pages:publish')}
      initialData={(page.content as Data | null) ?? null}
    />
  )
}
