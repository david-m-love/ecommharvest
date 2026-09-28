'use client'

import React from 'react'

import { toHref } from '@/lib/href'
import { trackCheckoutClick } from '@/lib/track'

/**
 * The button that sends somebody to the order form.
 *
 * A client component for one reason: it is the only place on the site worth
 * firing a conversion event from, and the order form is on GoHighLevel's domain
 * — so this click is the last thing we can observe before the money moves.
 *
 * **With no URL it is not a link.** A join button that goes nowhere is the
 * expensive kind of broken: it looks like the page works, the visitor clicks,
 * nothing happens, and they do not come back to try again. Rendered as a plainly
 * unavailable button with a line of explanation, it costs the same click and
 * tells whoever is looking at the page that the URL still needs pasting.
 */
export function JoinButton({
  label,
  href,
  where,
  missing,
  large,
}: {
  label?: string
  href?: string
  /** Which section the click came from, so the ad account can tell them apart. */
  where: string
  missing?: string
  large?: boolean
}) {
  const target = toHref(href)
  if (!label) return null

  if (!target) {
    return (
      <p className="joinsoon">
        <span className={large ? 'btn btn-lg btn-off' : 'btn btn-off'} aria-disabled="true">
          {label}
        </span>
        {missing ? <span className="joinsoon-note">{missing}</span> : null}
      </p>
    )
  }

  return (
    <a
      className={large ? 'btn btn-lg' : 'btn'}
      href={target}
      onClick={() => trackCheckoutClick(where)}
      /**
       * Same tab. The order form is the next step of this journey, not a
       * reference somebody wants to come back from — and a new tab on a phone
       * is a window people lose.
       */
    >
      {label}
    </a>
  )
}
