'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * The two pointer effects in src/styles/depth.css that CSS cannot do alone.
 *
 *   - The page's primary button — the large one in the hero — leans a few
 *     pixels toward the pointer as it gets close. One button per page, on
 *     purpose: on one it reads as the thing to press, on ten it is a gimmick.
 *   - The navy cards catch a soft light that follows the pointer across them.
 *
 * Both only write CSS variables; the stylesheet decides what they look like,
 * and without this component every surface simply keeps its resting light.
 * Nothing runs on a touch screen (there is no pointer to follow) or for anyone
 * who has asked for reduced motion. Renders nothing.
 */

/** How far outside the button the pull starts, in pixels. */
const REACH = 90
/** The furthest the button moves. Past about 8px it reads as running away. */
const MAX_SHIFT = 7
const LIT = '.finalcard, .card-dark, .fbar'

export function Ambient() {
  const pathname = usePathname()

  useEffect(() => {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const stillPlease = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!canHover || stillPlease) return

    const button = document.querySelector<HTMLElement>('.slot.hero .btn-lg')
    button?.classList.add('is-magnetic')

    let frame = 0
    let last: PointerEvent | null = null
    let near = false

    const update = () => {
      frame = 0
      const e = last
      if (!e) return

      if (button) {
        const r = button.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        // Distance from the button's edge, not its centre, so a wide button
        // does not need the pointer to be nearer its middle than its ends.
        const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right)
        const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom)
        const gap = Math.hypot(dx, dy)
        if (gap < REACH) {
          const pull = 1 - gap / REACH
          const x = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, (e.clientX - cx) * 0.08 * pull))
          const y = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, (e.clientY - cy) * 0.16 * pull))
          button.classList.remove('is-leaving')
          button.style.setProperty('--mag-x', `${x.toFixed(2)}px`)
          button.style.setProperty('--mag-y', `${y.toFixed(2)}px`)
          near = true
        } else if (near) {
          release()
        }
      }

      const lit = (e.target as Element | null)?.closest?.<HTMLElement>(LIT)
      if (lit) {
        const r = lit.getBoundingClientRect()
        lit.style.setProperty('--lx', `${Math.round(e.clientX - r.left)}px`)
        lit.style.setProperty('--ly', `${Math.round(e.clientY - r.top)}px`)
      }
    }

    /** Back to rest, on the spring rather than the quick tracking ease. */
    const release = () => {
      near = false
      if (!button) return
      button.classList.add('is-leaving')
      button.style.removeProperty('--mag-x')
      button.style.removeProperty('--mag-y')
    }

    const onMove = (e: PointerEvent) => {
      last = e
      if (!frame) frame = requestAnimationFrame(update)
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', release)
    window.addEventListener('blur', release)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', release)
      window.removeEventListener('blur', release)
      if (frame) cancelAnimationFrame(frame)
      release()
      button?.classList.remove('is-magnetic', 'is-leaving')
    }
  }, [pathname])

  return null
}
