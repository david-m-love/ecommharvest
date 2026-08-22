import { Render } from '@measured/puck/rsc'
import type { Metadata } from 'next'
import React from 'react'

import { config } from '@/blocks'
import { builderMetadata, loadBuilderPage } from '@/lib/builder-page'
import { siteMetadata } from '@/lib/site-styles'

const FALLBACK: Metadata = {
  title: 'Privacy Policy',
  description: 'How eCommHarvest collects, uses, and shares information from Q4 Masterclass registrations.',
  alternates: { canonical: '/privacy' },
}

export async function generateMetadata(): Promise<Metadata> {
  return builderMetadata(await loadBuilderPage('privacy'), FALLBACK)
}

/**
 * Editable in the page builder, with the original hand-built version below as a
 * fallback.
 *
 * A legal document that needs a developer and a deploy to fix a clause is a
 * document that stays wrong. The fallback stays because this page has to render
 * even if the builder page is missing — mid-deploy, before the migration, or if
 * someone deletes it — and a privacy policy that 404s is worse than one that is
 * a version behind.
 */
export default async function PrivacyRoute() {
  const page = await loadBuilderPage('privacy')
  if (page) return <Render config={config} data={page.data} metadata={await siteMetadata()} />
  return <HandBuiltPrivacyPage />
}

function HandBuiltPrivacyPage() {
  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <a href="/" className="brand" aria-label="eCommHarvest home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="eCommHarvest" width={197} height={34} />
          </a>
          <div className="topbar-right">
            <span className="stamp">Thursday, September 3 &middot; 11:00 AM MT &middot; free</span>
          </div>
        </div>
      </header>

      <main>

        <div className="legal">
        <a className="backlink" href="/">&larr; Back to the masterclass</a>
        <h1>Privacy Policy</h1>
        <p className="updated">Last updated: 19 August 2026</p>
        <div className="callout"><p><strong>Draft for review.</strong> This document was prepared as a starting point and has not been reviewed by a lawyer. Confirm the bracketed details and have counsel check it before launch.</p></div>

        <p>This policy explains what we collect when you register for the Q4 Revenue Playbook masterclass, why we collect it, who it is shared with, and how to get it removed. It covers this website and the emails we send about the masterclass.</p>
        <p>The site is operated by <strong>[Legal entity name]</strong>, <strong>[registered address]</strong>, trading as eCommHarvest. Questions about anything below go to <a href="mailto:[privacy@yourdomain.com]">[privacy@yourdomain.com]</a>.</p>

        <h2>What we collect</h2>
        <p>When you register, the form asks for:</p>
        <ul>
        <li><strong>Your first name and email address.</strong> Required &mdash; we cannot send you the join link without them.</li>
        <li><strong>Your store URL.</strong> Optional. We use it to understand who is in the room so the session is relevant.</li>
        <li><strong>Your marketing consent.</strong> We record that you ticked the box, so we can show you agreed to hear from us.</li>
        </ul>
        <p>Our server also records technical details that arrive with any web request: your IP address, your browser&rsquo;s user-agent string, the page that referred you, and the time you registered. We use these to prevent spam and abuse of the form.</p>
        <p>If you attend live, the webinar platform will process your attendance and anything you type into chat or Q&amp;A. That platform is <strong>[webinar platform name]</strong> and its own privacy policy applies to that data.</p>

        <h2>Why we use it</h2>
        <ul>
        <li><strong>To deliver the masterclass</strong> &mdash; confirmation, reminders, the join link, and the replay. This is necessary to give you the thing you signed up for.</li>
        <li><strong>To send you marketing emails</strong> about e-commerce growth, Q4 strategy, and our services. This is based on the consent you gave at registration, and you can withdraw it at any time.</li>
        <li><strong>To keep the form working</strong> &mdash; rate limiting and spam prevention, based on our legitimate interest in not being flooded by bots.</li>
        </ul>
        <p>We do not sell your personal information, and we do not share it with advertising networks for them to build profiles of you.</p>

        <h2>Who we share it with</h2>
        <p>The masterclass is hosted in partnership with <strong>Tiny 3D Temples</strong>, <strong>B.O.M.Socks</strong>, and <strong>Come Follow Me FHE</strong>. <strong>[Confirm which of the following is true before launch and delete the other.]</strong></p>
        <ul>
        <li><em>Option A &mdash; not shared:</em> registration details stay with eCommHarvest. The host brands promote the event but do not receive your details.</li>
        <li><em>Option B &mdash; shared:</em> if you registered through a host brand&rsquo;s promotion, your name and email are also shared with that brand so they can email you. By registering you consent to that sharing, and you can unsubscribe from each brand separately.</li>
        </ul>
        <p>We also use service providers who process data on our behalf: our email platform, our webinar platform, our hosting and database provider, and our analytics provider. They may only use the data to provide their service to us.</p>
        <p>We will disclose information if the law requires it, or to protect our rights, safety, or property.</p>

        <h2>Cookies and tracking</h2>
        <p><strong>[Update this section to match what you actually install.]</strong> The site itself sets no cookies and runs no third-party scripts other than Google Fonts, which serves the typefaces and receives your IP address as part of that request.</p>
        <p>If you run advertising for this event, an advertising pixel such as the Meta pixel may be added to measure registrations. When that is live, this section must name each pixel, say what it does, and explain how to opt out &mdash; and, for visitors in the UK, EU, or a US state that requires it, the pixel must not fire until consent is given.</p>

        <h2>How long we keep it</h2>
        <p>Registration records are kept for <strong>[e.g. 24 months]</strong> after the event, or until you ask us to delete them. If you unsubscribe, we keep a minimal record of your email address so we can honour that choice and avoid contacting you again.</p>

        <h2>Your choices and rights</h2>
        <ul>
        <li><strong>Unsubscribe</strong> using the link at the bottom of any email we send. That stops the marketing immediately.</li>
        <li><strong>Access, correction, deletion, or a copy</strong> of your data &mdash; email us and we will action it. Depending on where you live, this may be a legal right under the GDPR, the UK GDPR, the CCPA/CPRA, or a similar state law.</li>
        <li><strong>Withdraw consent</strong> at any time. It does not affect processing that already happened.</li>
        <li><strong>Complain</strong> to your data protection authority if you think we have handled your data badly. We would rather you told us first so we can fix it.</li>
        </ul>
        <p>We do not knowingly collect information from children under 16. If you believe a child has registered, email us and we will delete the record.</p>

        <h2>Where your data is held</h2>
        <p>Our hosting, email, and webinar providers operate in the United States, so your information is processed there. If you are in the UK or EU, that transfer relies on the standard contractual clauses or another approved safeguard in our agreements with those providers.</p>

        <h2>Security</h2>
        <p>Registrations are sent over HTTPS and stored with access limited to people who need it. No system is perfectly secure, so we cannot guarantee absolute security &mdash; but we will tell you and the relevant regulator if a breach affects you and the law requires notice.</p>

        <h2>Changes</h2>
        <p>If we change this policy we will update the date at the top. Material changes affecting how we use data you already gave us will be notified by email.</p>

        <h2>Contact</h2>
        <p><strong>[Legal entity name]</strong><br />[Registered address]<br /><a href="mailto:[privacy@yourdomain.com]">[privacy@yourdomain.com]</a></p>
        </div>
      </main>

      <footer>
        <div className="foot-in">
          <span>&copy; 2026 eCommHarvest</span>
          <nav className="foot-nav">
            <a href="/masterclass">Masterclass</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms &amp; Conditions</a>
          </nav>
          <span>Hosted by Tiny 3D Temples &middot; B.O.M.Socks &middot; Come Follow Me FHE</span>
        </div>
      </footer>
    </>
  )
}
