import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

export const metadata: Metadata = {
  title: 'Save my seat',
  robots: { index: false, follow: false },
}

/**
 * Funnel step 2 is GoHighLevel's native form, on go.ecommharvest.com. Nothing is
 * built here on purpose — a second registration form would be a second place for
 * leads to land and a second consent record to keep straight.
 *
 * Nothing links here any more: the landing page's CTAs point at the absolute GHL
 * URL, so they reach the real form from either host. This page survives only as
 * a signpost for anyone who types the path or follows an old link, and it says
 * where the form actually is.
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
        <h1>Registration lives on the funnel.</h1>
        <p className="lede">
          Funnel step 2 is a GoHighLevel page, so the form, the contact record and the email and SMS
          all stay in one place.
        </p>
        <p className="cta-row">
          <a className="btn" href="https://go.ecommharvest.com/register">
            Go to registration
          </a>
        </p>
        <p className="lede" style={{ marginTop: 34 }}>What that page needs:</p>
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
