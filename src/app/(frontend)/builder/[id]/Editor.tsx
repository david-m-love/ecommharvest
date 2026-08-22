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
  /** A recovered draft found in this browser, offered rather than applied. */
  const [recovered, setRecovered] = React.useState<Data | null>(null)
  const [recoveredAt, setRecoveredAt] = React.useState<string | null>(null)

  /**
   * Where an in-progress canvas is kept between keystrokes.
   *
   * Per page, in this browser only. The alternative — autosaving to the
   * database — would mean every keystroke on a live page could become the live
   * page, which is the opposite of what "Save draft" and "Update live page"
   * mean. This keeps the work safe from a closed laptop without blurring the
   * line between editing and publishing.
   */
  const storageKey = `ech-builder-draft-${pageId}`

  /**
   * A brand-new page opens as a working page rather than an empty canvas — an
   * empty builder is where people give up. `starterContent` is edited down.
   */
  const data: Partial<Data> = React.useMemo(
    () =>
      initialData?.content?.length
        ? initialData
        : { content: starterContent as Data['content'], root: {} },
    [initialData],
  )

  /**
   * What the canvas is currently showing, and a key to remount it.
   *
   * Puck takes its data as an initial value, so applying a recovered draft means
   * giving it a new one and a new key. A remount is heavier than a prop update
   * and happens at most once, when someone clicks Restore.
   */
  const [canvasData, setCanvasData] = React.useState<Partial<Data>>(data)
  const [canvasKey, setCanvasKey] = React.useState(0)

  const restore = () => {
    if (!recovered) return
    setCanvasData(recovered)
    setCanvasKey((n) => n + 1)
    setDirty(true)
    setRecovered(null)
  }

  const discardRecovered = () => {
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // Nothing to do.
    }
    setRecovered(null)
  }

  /**
   * On opening, look for work this browser saved and never stored.
   *
   * Offered, never applied silently: the local copy might be older than what
   * someone else published, and quietly overwriting the canvas with it would be
   * its own kind of data loss.
   */
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as { at: string; data: Data }
      if (!parsed?.data?.content) return
      // Nothing to recover if it matches what is already stored.
      if (JSON.stringify(parsed.data) === JSON.stringify(initialData ?? data)) {
        window.localStorage.removeItem(storageKey)
        return
      }
      setRecovered(parsed.data)
      setRecoveredAt(parsed.at)
    } catch {
      // Unparseable or unavailable storage is not worth a message.
    }
    // Once, on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      // Stored is stored: nothing left to recover.
      try {
        window.localStorage.removeItem(storageKey)
      } catch {
        // Nothing to do.
      }
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
    <>
      {/*
        Below about 1024px Puck renders a canvas with no Components panel and no
        Publish button — it is a desktop tool. Silence there reads as a broken
        page, so this says what is happening and offers the two things that *do*
        work on a phone: looking at the page, and going back.

        CSS-only: a media query cannot be wrong about the viewport, and a
        JavaScript check would flash the editor first.
      */}
      <div className="editor-toosmall">
        <div>
          <p className="eyebrow">Page builder</p>
          <h2>This needs a bigger screen.</h2>
          <p>
            Dragging blocks around needs room — the builder opens properly on a laptop or a
            desktop. On a phone you can still look at the page and come back to the list.
          </p>
          <div className="cta-row">
            <a className="btn" href={publicPath} target="_blank" rel="noopener">
              View the page
            </a>
            <a className="btn btn-ghost" href="/builder">
              All pages
            </a>
          </div>
        </div>
      </div>

      {recovered ? (
        <div className="consentbar" role="region" aria-label="Unsaved work found">
          <p>
            <strong>There is newer work in this browser</strong> that was never saved
            {recoveredAt ? ` — from ${new Date(recoveredAt).toLocaleString()}` : ''}. Restore it, or
            keep the saved version?
          </p>
          <div className="consentbar-actions">
            <button type="button" className="btn" onClick={restore}>
              Restore it
            </button>
            <button type="button" className="btn btn-ghost" onClick={discardRecovered}>
              Keep saved version
            </button>
          </div>
        </div>
      ) : null}

    <Puck
      key={canvasKey}
      config={config}
      data={canvasData}
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
        const serialised = JSON.stringify(next)
        const isDirty = serialised !== savedRef.current
        setDirty(isDirty)
        try {
          if (isDirty)
            window.localStorage.setItem(
              storageKey,
              JSON.stringify({ at: new Date().toISOString(), data: next }),
            )
          else window.localStorage.removeItem(storageKey)
        } catch {
          // Storage full or blocked: the editor still works, it just cannot
          // offer a recovery. Not worth interrupting anyone over.
        }
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
          {/* `editornav` distinguishes these from the same links inside the
              small-screen notice, which is hidden on a laptop — two elements
              with the same href and only one of them clickable is a trap for
              anything selecting by href, tests included. */}
          <a href="/builder" onClick={leaveEditor} className="editornav" style={navLinkStyle}>
            <span aria-hidden="true">&larr;</span> All pages
          </a>
          {/*
            Opens in a new tab, deliberately: checking the live page is something
            you do *while* editing, and navigating away from the canvas would
            mean finding your place again. A draft has no public page yet, so the
            link only appears once there is one.
          */}
          {currentStatus === 'published' ? (
            <a
              href={publicPath}
              target="_blank"
              rel="noopener"
              className="editornav"
              style={navLinkStyle}
            >
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
    </>
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
