'use client'

import { Puck, type Data } from '@measured/puck'
import '@measured/puck/puck.css'
import { useRouter } from 'next/navigation'
import React from 'react'

import { config, starterContent } from '@/blocks'
import type { SiteMetadata } from '@/lib/site-styles'

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
  siteMeta,
  publicPath,
}: {
  pageId: number
  title: string
  slug: string
  status: 'draft' | 'published'
  canPublish: boolean
  initialData: Data | null
  /** Global values the blocks need — currently the site logo. */
  siteMeta: SiteMetadata
  /**
   * Where this page is on the public site.
   *
   * Passed in rather than derived from the slug, because `/masterclass` and
   * `/privacy` own their routes while everything else lives under `/p/`. The
   * editor guessing would eventually guess wrong and send you to a redirect.
   */
  publicPath: string
}) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = React.useState(status)
  /**
   * Whether the canvas differs from what is stored.
   *
   * Tracked so leaving can warn. A back button without this is worse than no
   * back button: it makes discarding an afternoon's work a single click with no
   * confirmation, which is precisely the accident it would cause most often.
   */
  const [dirty, setDirty] = React.useState(false)
  const savedRef = React.useRef('')

  /**
   * A brand-new page opens as a working page rather than an empty canvas — an
   * empty builder is where people give up. `starterContent` is edited down.
   */
  const data: Partial<Data> = initialData?.content?.length
    ? initialData
    : { content: starterContent as Data['content'], root: {} }

  /**
   * The browser's own warning, for closing the tab or hitting reload — routes
   * the back link cannot intercept. Deliberately only while there is something
   * to lose: an unconditional prompt trains people to dismiss it.
   */
  React.useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const leaveEditor = (event: React.MouseEvent) => {
    if (!dirty) return
    const stay = !window.confirm(
      'You have changes that are not saved. Leave the editor and lose them?',
    )
    if (stay) event.preventDefault()
  }

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
      // What is on screen is now what is stored, so leaving is safe again.
      savedRef.current = JSON.stringify(next)
      setDirty(false)
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
      /* The same values the live page renders with, so the logo you see on the
         canvas is the logo that ships. */
      metadata={siteMeta}
      headerTitle={title}
      headerPath={publicPath}
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
      /**
       * The first change is what makes the page dirty; comparing against the
       * last saved snapshot rather than trusting the event means undoing back to
       * where you started correctly counts as clean again.
       */
      onChange={(next) => {
        if (!savedRef.current) savedRef.current = JSON.stringify(data)
        setDirty(JSON.stringify(next) !== savedRef.current)
      }}
      /**
       * Navigation lives in the header's action row, beside the publish
       * controls.
       *
       * The first attempt put a row of its own above the header via
       * `overrides.header`. It rendered — at y=876, the bottom of the window,
       * because Puck's shell is a full-height grid and an extra child becomes
       * its last row. A back button nobody can find is the bug it was meant to
       * fix, so these belong in the header that already exists.
       */
      renderHeaderActions={({ state }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/builder" onClick={leaveEditor} style={navLinkStyle}>
            <span aria-hidden="true">&larr;</span> All pages
          </a>
          {/*
            Opens in a new tab, deliberately: checking the live page is something
            you do *while* editing, and navigating away from the canvas would
            mean finding your place again. A draft has no public page yet, so the
            link only appears once there is one.
          */}
          {currentStatus === 'published' ? (
            <a href={publicPath} target="_blank" rel="noopener" style={navLinkStyle}>
              View live <span aria-hidden="true">&#8599;</span>
            </a>
          ) : null}
          <span style={{ fontSize: 12, color: error ? '#B4241C' : '#4E627A' }}>
            {error ||
              message ||
              (dirty ? 'Unsaved changes' : currentStatus === 'published' ? 'Live' : 'Draft')}
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


const navLinkStyle: React.CSSProperties = {
  font: '600 13px/1 "Plus Jakarta Sans", system-ui, sans-serif',
  color: '#16324F',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  // The header is a tight flex row: without this, "All pages" wraps onto two
  // lines and the arrow on "View live" lands on a line of its own.
  whiteSpace: 'nowrap',
  flex: 'none',
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
