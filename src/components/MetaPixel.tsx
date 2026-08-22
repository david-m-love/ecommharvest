'use client'

import Script from 'next/script'
import React from 'react'

/**
 * The Meta pixel, loaded only when it is allowed to be.
 *
 * `mode` decides what happens:
 *
 *   allowed  — load it now (outside the UK/EEA/Switzerland, no opt-out signal)
 *   ask      — show a small bar; load only if the visitor accepts
 *   refused  — do nothing at all, and never ask
 *
 * The decision is made on the server from the visitor's region and any Global
 * Privacy Control signal; this component only carries it out and remembers an
 * answer given here. Nothing about the pixel is in the page until it is
 * permitted — no script tag, no preconnect, no third-party request.
 *
 * The choice is kept in `localStorage`, not a cookie: a cookie would be sent on
 * every request to record that this visitor does not want to be tracked, which
 * is a small absurdity worth avoiding.
 */

const STORAGE_KEY = 'ech-ads-consent'

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; callMethod?: (...a: unknown[]) => void; loaded?: boolean; version?: string; push?: unknown }
    _fbq?: unknown
  }
}

export function MetaPixel({
  pixelId,
  mode,
  privacyHref = '/privacy',
}: {
  pixelId: string
  mode: 'allowed' | 'ask' | 'refused'
  privacyHref?: string
}) {
  /**
   * `null` until the stored answer has been read.
   *
   * Rendering the bar before reading storage would flash it at everyone who
   * already decided, on every page, which is how people learn to ignore these.
   */
  const [choice, setChoice] = React.useState<'yes' | 'no' | null | undefined>(undefined)

  React.useEffect(() => {
    if (mode !== 'ask') return
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      setChoice(stored === 'yes' ? 'yes' : stored === 'no' ? 'no' : null)
    } catch {
      // A browser with storage blocked gets asked each visit rather than tracked
      // without an answer.
      setChoice(null)
    }
  }, [mode])

  const remember = (answer: 'yes' | 'no') => {
    try {
      window.localStorage.setItem(STORAGE_KEY, answer)
    } catch {
      // Not being able to remember is not a reason to refuse the answer.
    }
    setChoice(answer)
  }

  if (mode === 'refused') return null

  const load = mode === 'allowed' || choice === 'yes'

  return (
    <>
      {load ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');fbq('track','PageView');`}
        </Script>
      ) : null}

      {mode === 'ask' && choice === null ? (
        <div className="consentbar" role="region" aria-label="Advertising cookies">
          <p>
            We measure how many people register for the masterclass using Meta&rsquo;s pixel. It is
            not used to build a profile of you, and we never send your name or email to it.{' '}
            <a href={privacyHref}>How we handle data</a>.
          </p>
          <div className="consentbar-actions">
            <button type="button" className="btn" onClick={() => remember('yes')}>
              Accept
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => remember('no')}>
              No thanks
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
