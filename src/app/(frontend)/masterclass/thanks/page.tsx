import { Render } from '@measured/puck/rsc'
import type { Metadata } from 'next'
import React from 'react'

import { config } from '@/blocks'
import { SiteFooterBar, SiteHeaderBar } from '@/blocks/SiteHeaderBar'
import { builderMetadata, loadBuilderPage } from '@/lib/builder-page'
import { EVENT_ELSEWHERE, EVENT_FORMAT, EVENT_WHEN } from '@/lib/event'
import { getSiteStyles, siteMetadata } from '@/lib/site-styles'

const FALLBACK: Metadata = {
  title: 'You’re registered',
  description: `Your seat is saved for the Q4 Profit Playbook masterclass on ${EVENT_WHEN}.`,
  // Never indexed: a confirmation page in search results is a page people reach
  // without having registered.
  robots: { index: false, follow: false },
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadBuilderPage('masterclass-thanks')
  return { ...builderMetadata(page, FALLBACK), robots: { index: false, follow: false } }
}

/**
 * Where GoHighLevel sends people after the form.
 *
 * A page-builder page now rather than the block that used to be pasted into GHL,
 * so the wording can be changed without a rebuild and a paste. The one job it
 * has beyond confirming is getting the confirmation email out of the promotions
 * tab — a message nobody finds is a registration that does not turn up.
 *
 * Falls back to a version in code if the record is missing, for the same reason
 * as `/register`: this is the page somebody lands on immediately after giving
 * you their email, and it must not be able to 404.
 */
export default async function ThanksPage() {
  const page = await loadBuilderPage('masterclass-thanks')
  if (page) {
    return <Render config={config} data={page.data} metadata={await siteMetadata()} />
  }

  const styles = await getSiteStyles()
  return (
    <>
      <SiteHeaderBar
        logoUrl={styles.logoUrl}
        logoText={styles.logoText}
        logoWidth={styles.logoWidth}
        logoHeight={styles.logoHeight}
      />
      <main>
        <section className="slot">
          <div className="slot-in">
            <p className="eyebrow">You’re in</p>
            <h1>Your seat is saved.</h1>
            <p className="lede">
              You’re registered for Your Q4 Profit Playbook — {EVENT_WHEN} {EVENT_ELSEWHERE}. A{' '}
              {EVENT_FORMAT}.
            </p>
            <div className="card-dark">
              <p className="eyebrow">Important</p>
              <h2>First, make sure you got my email.</h2>
              <p>
                It comes from “David at eCommHarvest” and has the link you’ll use to join. If it
                isn’t there within a few minutes, check Spam or Promotions, move it to your Primary
                inbox, and add david@ecommharvest.com to your contacts.
              </p>
              <p>
                <strong>
                  Then hit reply and tell me the biggest thing you need help figuring out before
                  Q4 — your question may shape what we cover live.
                </strong>
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooterBar />
    </>
  )
}
