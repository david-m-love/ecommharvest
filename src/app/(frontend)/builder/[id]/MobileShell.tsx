'use client'

import { createUsePuck, useGetPuck, type Data } from '@measured/puck'
import React from 'react'

import { config } from '@/blocks'

/**
 * The page builder, on a phone.
 *
 * What used to be here was a notice saying "this needs a bigger screen". It was
 * honest — Puck's own layout below 766px squeezes the canvas between two 186px
 * sidebars, which is unusable — but "come back at your desk" is not an answer for
 * someone whose computer *is* a phone.
 *
 * The three things that make it work:
 *
 *  1. **Panels cover the page instead of squeezing it.** Puck puts its component
 *     list and its field editor in grid columns beside the canvas. On a phone they
 *     are lifted out and laid over it, full width, one at a time. That is CSS —
 *     see `.editor-mobile` in the design system.
 *  2. **Tapping a block opens its fields.** On a laptop the fields appear in a
 *     sidebar that is always there, so selecting a block is enough. On a phone the
 *     panel has to be opened, and nobody should have to know that: selecting a
 *     block opens it, closing it deselects.
 *  3. **Blocks are added by tapping, not dragging.** Puck's drawer is drag-only,
 *     and you cannot drag from a panel onto a canvas the panel is covering. So the
 *     list here inserts on tap — which is also simply easier with a thumb.
 *
 * Everything is scoped to `max-width: 900px`. The laptop editor is untouched:
 * these bars are rendered but hidden, and the behaviours check the viewport
 * before doing anything.
 */

/** Matches `.editor-mobile` in the stylesheet. Change both together. */
const MOBILE = '(max-width: 900px)'

/**
 * Puck's top-level zone.
 *
 * Every block on these pages is a top-level section — none of them nest — so
 * inserting and reordering always happens here.
 */
const ROOT_ZONE = 'root:default-zone'

const usePuckState = createUsePuck<typeof config>()

/**
 * Which block is selected: its position, and the zone it sits in.
 *
 * Declared here because Puck's own `ItemSelector` type is internal — it reaches
 * the override's props but is not exported to import by name.
 */
type Selected = { index: number; zone?: string }

/**
 * What the editor knows and Puck does not: whether there are unsaved changes,
 * whether this person may publish, where the live page is, how to save.
 *
 * Passed by context rather than as props because the component that consumes it
 * is handed to Puck as an *override*, and an override that changes identity
 * remounts the entire editor. The override stays the same function for the life
 * of the page; the values it reads change underneath it.
 */
export type EditorBridge = {
  title: string
  status: 'draft' | 'published'
  dirty: boolean
  saving: boolean
  message: string | null
  error: string | null
  canPublish: boolean
  publicPath: string
  save: (data: Data, publish: boolean) => void
  /** The unsaved-changes confirmation, shared with the laptop header. */
  leave: (event: React.MouseEvent) => void
}

export const EditorBridgeContext = React.createContext<EditorBridge | null>(null)

/** Whether this is a phone-sized window, watched rather than measured once. */
const useMobile = () => {
  /**
   * False until the browser says otherwise, so the server and the first client
   * render agree. The bars are hidden by CSS above 900px anyway, so nothing
   * flashes.
   */
  const [mobile, setMobile] = React.useState(false)
  React.useEffect(() => {
    const query = window.matchMedia(MOBILE)
    const update = () => setMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return mobile
}

/**
 * Wraps Puck's whole layout, adding a bar above it and a bar below it.
 *
 * Handed to Puck as `overrides.puck`, which is the one override that receives
 * the entire editor as its children — the only place a component can both see
 * Puck's state and render outside its grid.
 */
export function MobileEditorShell({ children }: { children: React.ReactNode }) {
  const bridge = React.useContext(EditorBridgeContext)
  const mobile = useMobile()

  const getPuck = useGetPuck()
  const dispatch = usePuckState((s) => s.dispatch)
  const itemSelector = usePuckState((s) => s.appState.ui.itemSelector)
  const fieldsOpen = usePuckState((s) => s.appState.ui.rightSideBarVisible)
  const hasPast = usePuckState((s) => s.history.hasPast)
  const hasFuture = usePuckState((s) => s.history.hasFuture)
  const undo = usePuckState((s) => s.history.back)
  const redo = usePuckState((s) => s.history.forward)

  const [adding, setAdding] = React.useState(false)

  /**
   * How tall the bottom bar actually is, published as a CSS variable.
   *
   * The panels and the canvas are sized to stop above it, and hard-coding that
   * height was wrong the first time it was tried: a status line saying "Could
   * not reach the server" wraps to three lines, the bar grows, and it covers
   * whatever was at the bottom of the panel — including a Save button. Measured
   * instead, so the two can never disagree.
   */
  const barRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!mobile) return
    const bar = barRef.current
    if (!bar) return
    const publish = () =>
      document.documentElement.style.setProperty('--editor-bottom', `${bar.offsetHeight}px`)
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(bar)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--editor-bottom')
    }
  }, [mobile])

  /**
   * Selecting a block opens its fields.
   *
   * Without this, tapping a section on the canvas does nothing visible and the
   * only way to its text is an unlabelled icon in a header — which is exactly
   * the kind of thing that makes a tool feel broken rather than unfamiliar.
   */
  React.useEffect(() => {
    if (!mobile) return
    if (itemSelector) {
      setAdding(false)
      dispatch({ type: 'setUi', ui: { rightSideBarVisible: true, leftSideBarVisible: false } })
    }
  }, [mobile, itemSelector, dispatch])

  /**
   * Closing the fields panel also deselects.
   *
   * If it did not, the block would still be selected and tapping it again would
   * change nothing — so the panel could never be reopened without picking a
   * different block first.
   */
  const closeFields = () =>
    dispatch({ type: 'setUi', ui: { itemSelector: null, rightSideBarVisible: false } })

  const addBlock = (componentType: string) => {
    const index = getPuck().appState.data.content.length
    dispatch({ type: 'insert', componentType, destinationZone: ROOT_ZONE, destinationIndex: index })
    // Straight into editing it: a block added and then hunted for is a block
    // added twice.
    dispatch({
      type: 'setUi',
      ui: { itemSelector: { index, zone: ROOT_ZONE }, rightSideBarVisible: true },
    })
    setAdding(false)
  }

  const saveNow = (publish: boolean) => bridge?.save(getPuck().appState.data as Data, publish)

  /**
   * Unsaved work outranks the last thing that happened.
   *
   * The obvious order — error, then message, then state — leaves the bar saying
   * "Published." while you type the next paragraph, which is worse than saying
   * nothing: it is the one place on the screen that answers "is my work safe",
   * and it was answering yes.
   */
  const statusText =
    bridge?.error ||
    (bridge?.dirty
      ? 'Not saved yet'
      : bridge?.message || (bridge?.status === 'published' ? 'Live' : 'Draft'))

  return (
    <>
      <div className="editor-topbar">
        <a className="editor-back" href="/builder" onClick={bridge?.leave}>
          <span aria-hidden="true">&larr;</span> Pages
        </a>
        <span className="editor-pagename">{bridge?.title}</span>
        <button
          type="button"
          className="editor-icon"
          onClick={() => undo()}
          disabled={!hasPast}
          aria-label="Undo"
        >
          &#8630;
        </button>
        <button
          type="button"
          className="editor-icon"
          onClick={() => redo()}
          disabled={!hasFuture}
          aria-label="Redo"
        >
          &#8631;
        </button>
        {bridge?.status === 'published' ? (
          <a
            className="editor-back"
            href={bridge.publicPath}
            target="_blank"
            rel="noopener"
            aria-label="View the live page"
          >
            View <span aria-hidden="true">&#8599;</span>
          </a>
        ) : null}
      </div>

      {children}

      <div className="editor-actionbar" ref={barRef}>
        <p className={`editor-status${bridge?.error ? ' editor-status-bad' : ''}`}>{statusText}</p>
        <div className="editor-actionrow">
          {fieldsOpen ? (
            <button type="button" className="editor-btn" onClick={closeFields}>
              Done
            </button>
          ) : (
            <button
              type="button"
              className="editor-btn"
              onClick={() => setAdding((open) => !open)}
              aria-expanded={adding}
            >
              {adding ? 'Close' : '+ Add block'}
            </button>
          )}
          <button
            type="button"
            className="editor-btn"
            disabled={bridge?.saving}
            onClick={() => saveNow(false)}
          >
            {bridge?.saving ? 'Saving…' : 'Save'}
          </button>
          {bridge?.canPublish ? (
            <button
              type="button"
              className="editor-btn editor-btn-primary"
              disabled={bridge?.saving}
              onClick={() => saveNow(true)}
            >
              {bridge?.status === 'published' ? 'Update' : 'Publish'}
            </button>
          ) : null}
        </div>
      </div>

      {adding ? (
        <div className="editor-sheet" role="dialog" aria-label="Add a block">
          <div className="editor-sheet-head">
            <h2>Add a block</h2>
            <p>It goes at the bottom of the page. Move it once it is there.</p>
          </div>
          <div className="editor-sheet-body">
            {Object.entries(config.categories || {}).map(([key, category]) => (
              <section key={key}>
                <p className="editor-sheet-group">{category?.title || key}</p>
                {(category?.components || []).map((name) => (
                  <button
                    key={String(name)}
                    type="button"
                    className="editor-blockrow"
                    onClick={() => addBlock(String(name))}
                  >
                    {config.components[name as keyof typeof config.components]?.label ||
                      String(name)}
                  </button>
                ))}
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </>
  )
}

/**
 * A row of block controls above the fields, on a phone only.
 *
 * Puck puts duplicate, delete and a drag handle in a small bar floating over the
 * selected block on the canvas. The buttons are 32px, and reordering is by
 * dragging — both fine with a mouse and both awkward with a thumb, especially
 * dragging a section past two screenfuls of page.
 *
 * These do the same jobs with taps and full-size targets. Delete asks first,
 * because on a phone the difference between "move this section" and "delete this
 * section" can be four pixels.
 */
export function MobileFieldActions({
  children,
  itemSelector,
}: {
  children: React.ReactNode
  itemSelector?: Selected | null
}) {
  const mobile = useMobile()
  const getPuck = useGetPuck()
  const dispatch = usePuckState((s) => s.dispatch)
  const selectedType = usePuckState((s) => s.selectedItem?.type)

  /** Only top-level sections can be moved this way; nothing here nests. */
  const atRoot = Boolean(itemSelector) && (!itemSelector?.zone || itemSelector.zone === ROOT_ZONE)
  if (!mobile || !atRoot || !itemSelector) return <>{children}</>

  const total = getPuck().appState.data.content.length
  const index = itemSelector.index

  const move = (delta: number) => {
    const to = index + delta
    if (to < 0 || to >= total) return
    dispatch({
      type: 'reorder',
      sourceIndex: index,
      destinationIndex: to,
      destinationZone: ROOT_ZONE,
    })
    // Follow the block, so a second tap moves the same one again.
    dispatch({ type: 'setUi', ui: { itemSelector: { index: to, zone: ROOT_ZONE } } })
  }

  const remove = () => {
    const label =
      config.components[selectedType as keyof typeof config.components]?.label || 'this block'
    if (!window.confirm(`Delete ${label}? You can undo it with the arrow at the top.`)) return
    dispatch({ type: 'remove', index, zone: ROOT_ZONE })
    dispatch({ type: 'setUi', ui: { itemSelector: null, rightSideBarVisible: false } })
  }

  return (
    <>
      <div className="editor-blockbar">
        <button
          type="button"
          className="editor-btn editor-btn-small"
          onClick={() => move(-1)}
          disabled={index === 0}
        >
          <span aria-hidden="true">&uarr;</span> Up
        </button>
        <button
          type="button"
          className="editor-btn editor-btn-small"
          onClick={() => move(1)}
          disabled={index >= total - 1}
        >
          <span aria-hidden="true">&darr;</span> Down
        </button>
        <button
          type="button"
          className="editor-btn editor-btn-small editor-btn-danger"
          onClick={remove}
        >
          Delete
        </button>
      </div>
      {children}
    </>
  )
}
