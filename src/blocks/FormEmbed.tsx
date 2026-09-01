'use client'

import React from 'react'

/**
 * A GoHighLevel form, embedded on a page of ours.
 *
 * The split this settles: **we own the page, GHL owns the form.** Everything a
 * visitor reads — the headline, the reassurance, the logo, the speakers — is
 * ours, editable in the builder, and styled by our own design system. The form
 * itself stays in GHL, where the contact record, the workflows and the email and
 * SMS already live. Rebuilding the form here would mean a second place for leads
 * to land and a second consent record to reconcile, which is the whole reason
 * GHL is in the picture.
 *
 * ## How the sizing works
 *
 * The iframe cannot know how tall its contents are, and the page cannot read
 * inside a cross-origin frame. GHL's `form_embed.js` bridges that: the form
 * posts its height out, the script finds the iframe whose id matches
 * `inline-<form id>`, and sets the height in pixels. So:
 *
 *  - The **id must be exactly** `inline-<form id>`. It is not decoration; it is
 *    how the script finds this element.
 *  - The `minHeight` below is what people see *before* the script answers — on a
 *    slow connection that is a second or two of blank space, and a collapsed
 *    iframe reads as a broken page.
 *
 * ## What is loaded, and from where
 *
 * `api.shoqwave.com` is the GoHighLevel account's own domain for this. The form
 * sets cookies of its own — `data-cookie-consent` tells GHL to apply its consent
 * handling inside the frame, which is theirs to run, not ours to fake.
 *
 * The script is loaded once per page however many forms are on it, and left
 * alone on unmount: it is a third-party global that other embeds may be using,
 * and removing it would break a second form on the same page.
 */

const SCRIPT_SRC = 'https://api.shoqwave.com/js/form_embed.js'

/** The form's address, from its id. One place, so a typo cannot be half-right. */
export const formUrl = (formId: string) => `https://api.shoqwave.com/widget/form/${formId}`

export function FormEmbed({
  formId,
  title,
  minHeight,
}: {
  formId: string
  /**
   * What a screen reader announces. Worth setting: GHL's own embed code passes
   * the form's internal name through, so the default is something like
   * "Masterclass Registration 9/3/2026" — an out-of-date internal label read
   * aloud to the one visitor who cannot see the page.
   */
  title?: string
  minHeight?: number
}) {
  React.useEffect(() => {
    if (!formId) return
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    document.body.appendChild(script)
  }, [formId])

  if (!formId) {
    return (
      <p className="formembed-empty">
        No form chosen yet. Paste the form ID from GoHighLevel into this block.
      </p>
    )
  }

  const domId = `inline-${formId}`

  return (
    <iframe
      src={formUrl(formId)}
      id={domId}
      title={title || 'Registration form'}
      className="formembed"
      style={{ minHeight: minHeight || 620 }}
      data-layout="{'id':'INLINE'}"
      data-trigger-type="alwaysShow"
      data-trigger-value=""
      data-activation-type="alwaysActivated"
      data-activation-value=""
      data-deactivation-type="neverDeactivate"
      data-deactivation-value=""
      data-form-name={title || 'Registration form'}
      data-height="undefined"
      data-layout-iframe-id={domId}
      data-form-id={formId}
      data-cookie-consent="true"
      data-cookie-consent-provider="auto"
    />
  )
}
