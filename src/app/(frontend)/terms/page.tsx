import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Terms and conditions for the eCommHarvest Q4 Revenue Playbook masterclass.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
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
        <h1>Terms &amp; Conditions</h1>
        <p className="updated">Last updated: 19 August 2026</p>
        <div className="callout"><p><strong>Draft for review.</strong> This document was prepared as a starting point and has not been reviewed by a lawyer. Confirm the bracketed details and have counsel check it before launch.</p></div>

        <p>These terms apply to this website and to the free Q4 Revenue Playbook masterclass on 3 September 2026. By registering or attending, you agree to them. The site and event are operated by <strong>[Legal entity name]</strong>, trading as eCommHarvest (&ldquo;we&rdquo;, &ldquo;us&rdquo;).</p>

        <h2>What you are registering for</h2>
        <p>A free online masterclass of approximately 90 minutes, presented live by David Love with special guest Derek Crimin, hosted in partnership with Tiny 3D Temples, B.O.M.Socks, and Come Follow Me FHE. Registration is free and no payment details are required.</p>
        <p>We will send a replay to registrants after the event. We aim to run the session as scheduled, but we may change the date, time, running order, presenters, or content, or cancel the event. If we cancel, we will tell registrants by email.</p>
        <p>During the session we may describe our paid services. You are never obliged to buy anything.</p>

        <h2>No guarantee of results</h2>
        <p>This is the most important thing on this page. The masterclass teaches strategy and planning methods. It is not a promise of any particular outcome.</p>
        <ul>
        <li>Nothing we say is a guarantee, projection, or assurance of revenue, profit, average order value, conversion rate, cost per acquisition, or any other result.</li>
        <li>Any figures, examples, or case studies are illustrations of what happened in specific circumstances. They are not typical, average, or promised results.</li>
        <li>Your results depend on factors outside our control, including your products, pricing, margins, market, competition, ad platform behaviour, execution, and effort.</li>
        <li>You are solely responsible for the decisions you make in your business, including how much you spend on advertising.</li>
        </ul>

        <h2>Not professional advice</h2>
        <p>The content is general commercial education. It is not legal, tax, accounting, financial, or investment advice, and it does not create a client relationship. Take professional advice on your own circumstances before acting.</p>

        <h2>Recording</h2>
        <p>The session will be recorded, and the recording may be distributed to registrants and reused in our marketing. If you speak, appear on camera, or post in chat or Q&amp;A, that contribution may form part of the recording. If you would rather not appear, keep your camera and microphone off and do not post &mdash; you can still attend and watch.</p>

        <h2>Materials and intellectual property</h2>
        <p>The masterclass content, slides, templates, worksheets, recordings, and everything on this website belong to us or our licensors. You may use them for your own business, internally. You may not resell them, republish them, share the replay link or materials publicly, or present them as your own work without our written permission.</p>
        <p>Trade marks and logos belonging to Tiny 3D Temples, B.O.M.Socks, and Come Follow Me FHE remain the property of those brands and are used here with their permission as event hosts.</p>

        <h2>Acceptable use</h2>
        <p>Do not register under a false identity, submit someone else&rsquo;s details without their permission, attempt to disrupt or overload the site or the event, scrape or bulk-download the site, or behave abusively toward presenters or other attendees. We may remove anyone from the event and refuse future registrations.</p>

        <h2>Third-party links and platforms</h2>
        <p>The site links to the host brands&rsquo; stores, and the event runs on a third-party webinar platform. We do not control those sites and services and are not responsible for their content, their availability, or their handling of your data. Their own terms apply when you use them.</p>

        <h2>Availability</h2>
        <p>We try to keep the site and the event available but cannot promise either will be uninterrupted or error-free. We may change or withdraw any part of the site at any time.</p>

        <h2>Limitation of liability</h2>
        <p>To the fullest extent the law allows, we are not liable for lost profits, lost revenue, lost data, wasted advertising spend, or any indirect or consequential loss arising from the masterclass, the materials, or this site. Where liability cannot be excluded, it is limited to <strong>[e.g. USD 100]</strong>, reflecting that the masterclass is provided free of charge.</p>
        <p>Nothing here excludes liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot lawfully be excluded.</p>

        <h2>Privacy</h2>
        <p>How we handle your information is set out in our <a href="/privacy">Privacy Policy</a>, which forms part of these terms.</p>

        <h2>Changes to these terms</h2>
        <p>We may update these terms. The version published here when you register is the one that applies to you.</p>

        <h2>Governing law</h2>
        <p>These terms are governed by the laws of <strong>[state / country]</strong>, and the courts of <strong>[jurisdiction]</strong> have exclusive jurisdiction over any dispute.</p>

        <h2>Contact</h2>
        <p><strong>[Legal entity name]</strong><br />[Registered address]<br /><a href="mailto:[hello@yourdomain.com]">[hello@yourdomain.com]</a></p>
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
