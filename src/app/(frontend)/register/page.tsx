import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

export const metadata: Metadata = {
  title: 'Save my seat',
  robots: { index: false, follow: false },
}

/**
 * Funnel step 2 is GoHighLevel's native form, on GHL's domain. Nothing is built
 * here on purpose — a second registration form would be a second place for
 * leads to land and a second consent record to keep straight.
 *
 * This page exists so the landing page's four CTAs resolve while it is being
 * proofed on this deployment, and it says what it is rather than pretending.
 * Once the GHL step's URL is settled, this becomes a redirect to it.
 */
export default function RegisterPlaceholder() {
  return (
    <main className="slot hero">
      <div className="slot-in">
        <p className="eyebrow">
          <Link href="/masterclass" className="plainlink">
            ← Back to the masterclass page
          </Link>
        </p>
        <h1>This is where GoHighLevel’s form goes.</h1>
        <p className="lede">
          Funnel step 2. This placeholder exists so the “Save my seat” buttons can be clicked while
          the landing page is being proofed.
        </p>
        <ul className="bullets">
          <li>
            <span className="b-t">
              <strong>First name, email, and phone</strong> — phone is required for SMS
            </span>
          </li>
          <li>
            <span className="b-t">
              <strong>Two separate consent checkboxes</strong> — email consent is not consent to
              text someone
            </span>
          </li>
          <li>
            <span className="b-t">
              <strong>Store URL</strong>, optional
            </span>
          </li>
          <li>
            <span className="b-t">
              Submit reads <strong>Save my seat</strong> and redirects to the thank-you step
            </span>
          </li>
        </ul>
      </div>
    </main>
  )
}
