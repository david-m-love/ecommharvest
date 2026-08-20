'use client'

import { Puck, type Data } from '@measured/puck'
import '@measured/puck/puck.css'
import { useRouter } from 'next/navigation'
import React from 'react'

import { config, starterContent } from '@/blocks'

/**
 * The drag-and-drop canvas.
 *
 * Puck owns the editing UI. What this component owns is everything around it:
 * saving, publishing, telling the person what state their page is in, and
 * hiding the publish control from someone who is not allowed to publish.
 */
export function Editor({
  pageId,
  title,
  slug,
  status,
  canPublish,
  initialData,
}: {
  pageId: number
  title: string
  slug: string
  status: 'draft' | 'published'
  canPublish: boolean
  initialData: Data | null
}) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = React.useState(status)

  /**
   * A brand-new page opens as a working page rather than an empty canvas — an
   * empty builder is where people give up. `starterContent` is edited down.
   */
  const data: Partial<Data> = initialData?.content?.length
    ? initialData
    : { content: starterContent as Data['content'], root: {} }

  const save = async (next: Data, publish: boolean) => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/builder/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: next, publish }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error || 'Could not save. Your work is still on screen — try again.')
        return
      }
      if (body.status) setCurrentStatus(body.status)
      setMessage(publish ? 'Published.' : 'Saved.')
      // Refresh so the public page picks the change up immediately.
      router.refresh()
    } catch {
      setError('Could not reach the server. Your work is still on screen — try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Puck
      config={config}
      data={data}
      headerTitle={title}
      headerPath={`/p/${slug}`}
      /**
       * Render in the same document rather than Puck's default iframe.
       *
       * The blocks are styled entirely by the app's own stylesheet, which is
       * already loaded here; an iframe would need it injected separately and
       * would silently render everything unstyled if that ever broke. The cost
       * is that the viewport buttons resize by browser window rather than by
       * canvas, which is a fair trade for a design system that cannot be edited
       * from inside the builder anyway.
       */
      iframe={{ enabled: false }}
      onPublish={(next) => save(next, true)}
      renderHeaderActions={({ state }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: error ? '#B4241C' : '#4E627A' }}>
            {error || message || (currentStatus === 'published' ? 'Live' : 'Draft')}
          </span>
          {/*
            The canvas edits layout; the name, URL and search description live on
            the record. Rather than duplicate those inputs here — two fields that
            can disagree — this sends you to the one screen that owns them.
          */}
          <a
            href={`/admin/collections/pages/${pageId}`}
            style={{ ...buttonStyle(false), textDecoration: 'none' }}
          >
            Name &amp; URL
          </a>
          <button
            type="button"
            disabled={saving}
            onClick={() => save(state.data, false)}
            style={buttonStyle(false)}
          >
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          {/* Hidden rather than disabled: a control you may never use is noise. */}
          {canPublish ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => save(state.data, true)}
              style={buttonStyle(true)}
            >
              {currentStatus === 'published' ? 'Update live page' : 'Publish'}
            </button>
          ) : null}
        </div>
      )}
    />
  )
}

const buttonStyle = (primary: boolean): React.CSSProperties => ({
  font: '600 13px/1 "Plus Jakarta Sans", system-ui, sans-serif',
  padding: '10px 16px',
  borderRadius: 999,
  cursor: 'pointer',
  border: primary ? 'none' : '1px solid #DCE5EC',
  background: primary ? '#C99132' : '#FFFFFF',
  color: primary ? '#0F2439' : '#16324F',
})
