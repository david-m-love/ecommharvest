import { Render } from '@measured/puck/rsc'
import type { Metadata } from 'next'
import React from 'react'

import { config } from '@/blocks'
import { FormEmbed } from '@/blocks/FormEmbed'
import { SiteFooterBar, SiteHeaderBar } from '@/blocks/SiteHeaderBar'
import { builderMetadata, loadBuilderPage } from '@/lib/builder-page'
import { EVENT_ELSEWHERE, EVENT_WHEN, MASTERCLASS_FORM_ID } from '@/lib/event'
import { getSiteStyles, siteMetadata } from '@/lib/site-styles'

const FALLBACK: Metadata = {
  title: 'Save my seat',
  description:
    'Save your seat for the Q4 Revenue Playbook masterclass. Ninety minutes, live, replay included.',
  alternates: { canonical: '/masterclass/register' },
  // The masterclass page is the one that should rank; a thin registration page
  // competing with it in search helps nobody.
  robots: { index: false, follow: true },
}

export async function generateMetadata(): Promise<Metadata> {
  return builderMetadata(await loadBuilderPage('masterclass-register'), FALLBACK)
}

/**
 * Registration, on this site, under the masterclass it belongs to.
 *
 * It used to be a GoHighLevel page on go.ecommharvest.com, with our HTML pasted
 * above and below their form. Now the page is a page-builder page like any
 * other and only the **form** is GoHighLevel's, embedded in a block. The contact
 * record, the workflows and the email and SMS are still theirs — that is what
 * GHL is for — but the words, the brand and the layout are edited here, and the
 * whole funnel is on one domain.
 *
 * The fallback below is the same page written in code, for the window between
 * this deploying and its migration running — and for the day somebody deletes
 * the record. A registration page that 404s is the most expensive 404 on the
 * site, so it does not get to depend on a database row.
 */
export default async function RegisterPage() {
  const page = await loadBuilderPage('masterclass-register')
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
        rightText={`${EVENT_WHEN} · free`}
      />
      <main>
        <section className="slot">
          <div className="slot-in">
            <p className="eyebrow">
              {EVENT_WHEN} {EVENT_ELSEWHERE}
            </p>
            <h1>Save your seat.</h1>
            <p className="lede">
              Ninety minutes, live, and you leave with your Q4 mapped out. The replay comes to
              everyone who registers, so book it even if the time is awkward.
            </p>
          </div>
        </section>
        <section className="slot wash">
          <div className="slot-in formwrap">
            <FormEmbed formId={MASTERCLASS_FORM_ID} title="Masterclass registration" />
          </div>
        </section>
      </main>
      <SiteFooterBar />
    </>
  )
}
