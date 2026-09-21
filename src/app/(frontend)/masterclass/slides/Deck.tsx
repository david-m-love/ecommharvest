'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { deckSlides } from './slides'

/* ============================================================================
   The presentation shell: one slide at a time, and the controls to move.
   ----------------------------------------------------------------------------
   What the words say is in `slides.tsx`. This file is only the machinery, and
   it is deliberately plain machinery — a presenter cannot debug a clever deck
   thirty seconds before going live, so there is no slide library, no gesture
   framework and no animation engine. A number in state, a hash in the address
   bar, and one keydown listener.
   ========================================================================== */

/** How long the pointer must be still before the controls fade out. */
const IDLE_MS = 2600

const Chevron = ({ back }: { back?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d={back ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const GridIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {[
      [4, 4],
      [14, 4],
      [4, 14],
      [14, 14],
    ].map(([x, y]) => (
      <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.8" />
    ))}
  </svg>
)

const FullscreenIcon = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d={
        on
          ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5'
          : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'
      }
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export function Deck({ logoUrl }: { logoUrl?: string | null }) {
  const slides = useMemo(() => deckSlides({ logoUrl }), [logoUrl])
  const last = slides.length - 1

  const [index, setIndex] = useState(0)
  const [overview, setOverview] = useState(false)
  const [help, setHelp] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [idle, setIdle] = useState(false)
  /**
   * False until the address bar has been read. Without it the first render
   * would write `#slide-1` over the `#slide-9` somebody just pasted, and the
   * deck would always open on slide one.
   */
  const [ready, setReady] = useState(false)

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const go = useCallback(
    (to: number | ((n: number) => number)) => {
      setIndex((n) => {
        const next = typeof to === 'function' ? to(n) : to
        return Math.min(Math.max(next, 0), last)
      })
    },
    [last],
  )

  const next = useCallback(() => go((n) => n + 1), [go])
  const prev = useCallback(() => go((n) => n - 1), [go])

  /* ---- the address bar ------------------------------------------------- */

  /** `#slide-5` is one-based, because the counter on screen is. */
  const readHash = useCallback(() => {
    const match = /^#slide-(\d+)$/.exec(window.location.hash)
    if (!match) return
    const wanted = Number(match[1]) - 1
    if (Number.isFinite(wanted)) go(wanted)
  }, [go])

  useEffect(() => {
    readHash()
    setReady(true)
    window.addEventListener('hashchange', readHash)
    return () => window.removeEventListener('hashchange', readHash)
  }, [readHash])

  useEffect(() => {
    if (!ready) return
    // replaceState, not a new history entry: seventeen slides would otherwise
    // bury whatever the presenter was looking at before, and "back" would mean
    // "one slide" rather than "out of the deck".
    window.history.replaceState(null, '', `#slide-${index + 1}`)
  }, [index, ready])

  /* ---- fullscreen ------------------------------------------------------- */

  /**
   * Whether this browser will go fullscreen — decided after mounting, not while
   * rendering. `typeof document !== 'undefined'` in the render would give the
   * server one answer and the browser another, and React would throw away the
   * whole tree and rebuild it on every load.
   */
  const [canFullscreen, setCanFullscreen] = useState(false)

  const toggleFullscreen = useCallback(() => {
    if (!document.documentElement.requestFullscreen) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen().catch(() => {})
  }, [])

  useEffect(() => {
    setCanFullscreen(Boolean(document.documentElement.requestFullscreen))
    const sync = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  /* ---- keyboard --------------------------------------------------------- */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case 'n':
          event.preventDefault()
          next()
          return
        case ' ':
          // Space advances wherever the focus happens to be. preventDefault is
          // what stops it *also* pressing a focused Previous button — which
          // would move two slides, in opposite directions, on one keystroke.
          event.preventDefault()
          next()
          return
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
        case 'Backspace':
        case 'p':
          event.preventDefault()
          prev()
          return
        case 'Home':
          event.preventDefault()
          go(0)
          return
        case 'End':
          event.preventDefault()
          go(last)
          return
        case 'f':
          event.preventDefault()
          toggleFullscreen()
          return
        case 'g':
        case 'o':
          event.preventDefault()
          setHelp(false)
          setOverview((open) => !open)
          return
        case '?':
          event.preventDefault()
          setOverview(false)
          setHelp((open) => !open)
          return
        case 'Escape':
          setOverview(false)
          setHelp(false)
          return
        default:
          return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, last, next, prev, toggleFullscreen])

  /* ---- the controls fade out when nothing is happening ------------------ */

  useEffect(() => {
    const wake = () => {
      setIdle(false)
      if (idleTimer.current) clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS)
    }
    wake()
    window.addEventListener('pointermove', wake)
    window.addEventListener('pointerdown', wake)
    window.addEventListener('keydown', wake)
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      window.removeEventListener('pointermove', wake)
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
    }
  }, [])

  /* ---- swipe, for reviewing the deck on a phone ------------------------- */

  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (event: React.TouchEvent) => {
    const point = event.changedTouches[0]
    touch.current = { x: point.clientX, y: point.clientY }
  }
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touch.current
    if (!start) return
    touch.current = null
    const point = event.changedTouches[0]
    const dx = point.clientX - start.x
    const dy = point.clientY - start.y
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy)) return
    dx < 0 ? next() : prev()
  }

  const slide = slides[index]
  const overlayOpen = overview || help
  const percent = ((index + 1) / slides.length) * 100

  return (
    <div
      className={idle && !overlayOpen ? 'deck-root deck-idle' : 'deck-root'}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="deck-progress" aria-hidden="true">
        <div className="deck-progress-bar" style={{ width: `${percent}%` }} />
      </div>

      <div className="deck-stage">
        <section
          // The key is what makes React replace the slide rather than patch it,
          // which is what re-runs the entrance animation on every move.
          key={index}
          className={`sl sl-${slide.tone ?? 'light'}`}
          aria-roledescription="slide"
          aria-label={`Slide ${index + 1} of ${slides.length}: ${slide.title}`}
        >
          {slide.body}
          {/* The brand, quietly, on every slide but the title — which carries it
              full size already. */}
          {index > 0 ? <span className="sl-mark">eCommHarvest</span> : null}
        </section>
      </div>

      {/* Edge click targets. Invisible until the pointer is near them, so a deck
          being presented has nothing on it that was not put there on purpose. */}
      {index > 0 ? (
        <button type="button" className="deck-hit deck-hit-prev" onClick={prev} aria-label="Previous slide">
          <Chevron back />
        </button>
      ) : null}
      {index < last ? (
        <button type="button" className="deck-hit deck-hit-next" onClick={next} aria-label="Next slide">
          <Chevron />
        </button>
      ) : null}

      <div className="deck-chrome">
        <button
          type="button"
          className="deck-btn"
          onClick={prev}
          disabled={index === 0}
          aria-label="Previous slide"
        >
          <Chevron back />
        </button>
        <button
          type="button"
          className="deck-btn"
          onClick={next}
          disabled={index === last}
          aria-label="Next slide"
        >
          <Chevron />
        </button>
        <button
          type="button"
          className="deck-count deck-count-btn"
          onClick={() => {
            setHelp(false)
            setOverview((open) => !open)
          }}
          aria-label="Jump to a slide"
          aria-expanded={overview}
        >
          {index + 1} / {slides.length}
        </button>
        <button
          type="button"
          className="deck-btn"
          onClick={() => {
            setHelp(false)
            setOverview((open) => !open)
          }}
          aria-label="All slides"
        >
          <GridIcon />
        </button>
        {canFullscreen ? (
          <button
            type="button"
            className="deck-btn"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? 'Leave fullscreen' : 'Present fullscreen'}
          >
            <FullscreenIcon on={fullscreen} />
          </button>
        ) : null}
        <button
          type="button"
          className="deck-btn"
          onClick={() => {
            setOverview(false)
            setHelp((open) => !open)
          }}
          aria-label="Keyboard shortcuts"
        >
          ?
        </button>
      </div>

      {overview ? (
        <div className="deck-overlay" role="dialog" aria-label="All slides">
          <div className="deck-overlay-head">
            <h2>All slides</h2>
            <p>CLICK TO JUMP · G CLOSES</p>
            <button type="button" className="deck-btn deck-overlay-close" onClick={() => setOverview(false)}>
              Close
            </button>
          </div>
          <div className="deck-grid">
            {slides.map((entry, i) => (
              <button
                type="button"
                key={entry.title}
                className="deck-tile"
                aria-current={i === index}
                onClick={() => {
                  go(i)
                  setOverview(false)
                }}
              >
                <span className="deck-tile-n">
                  {String(i + 1).padStart(2, '0')} · {(entry.tone ?? 'light').toUpperCase()}
                </span>
                <span className="deck-tile-t">{entry.title}</span>
                {/* Only ever here: a "placeholder" label belongs in the
                    presenter's own view, never on a shared screen. */}
                {entry.note ? <span className="deck-tile-note">{entry.note}</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {help ? (
        <div className="deck-overlay" role="dialog" aria-label="Keyboard shortcuts">
          <div className="deck-overlay-head">
            <h2>Keyboard</h2>
            <p>? CLOSES</p>
            <button type="button" className="deck-btn deck-overlay-close" onClick={() => setHelp(false)}>
              Close
            </button>
          </div>
          <div className="deck-keys">
            <div>
              <kbd>→ ↓ space</kbd> Next slide
            </div>
            <div>
              <kbd>← ↑</kbd> Previous slide
            </div>
            <div>
              <kbd>home / end</kbd> First / last slide
            </div>
            <div>
              <kbd>G</kbd> All slides, to jump
            </div>
            <div>
              <kbd>F</kbd> Fullscreen
            </div>
            <div>
              <kbd>?</kbd> This list
            </div>
            <div>
              <kbd>#slide-7</kbd> Open the deck on a slide
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
