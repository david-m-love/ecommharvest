import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'You’re registered',
  description: 'Your seat is saved for the Q4 Revenue Playbook masterclass on Thursday, September 3 at 11:00 AM MT.',
  robots: { index: false, follow: false },
}

export default function ThanksPage() {
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

        <div className="thanks">
        <div className="tick" aria-hidden="true">&#10003;</div>
        <h1>You&rsquo;re in. Your seat is saved.</h1>
        <p className="lede">Check your inbox for the confirmation &mdash; the join link is in there. If it hasn&rsquo;t arrived in a few minutes, look in spam or promotions and drag it to your primary inbox so the reminders reach you.</p>

        <p className="when"><strong>Thursday, September 3 &middot; 11:00 AM MT</strong> <span className="when-tz">(1:00 PM ET / 10:00 AM PT)</span></p>

        <div className="addcal">
        <a className="btn btn-ghost" href="/masterclass.ics">Add to calendar (.ics)</a>
        <a className="btn btn-ghost" href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Your+Q4+Revenue+Playbook%2C+Built+in+90+Minutes&dates=20260903T170000Z%2F20260903T183000Z&details=Free+90-minute+masterclass+with+David+Love+and+Derek+Crimin.+The+join+link+is+in+your+confirmation+email." target="_blank" rel="noopener">Add to Google Calendar</a>
        </div>

        <div className="nextsteps">
        <p className="eyebrow">Before September 3</p>
        <p className="leadin">Two things that will make the 90 minutes far more useful:</p>
        <ul className="bullets">
        <li><span className="b-t"><strong>Pull last year&rsquo;s Q4 numbers</strong> &mdash; revenue, AOV, conversion rate, and what you spent on ads. We build your plan against your real baseline, not a generic one.</span></li>
        <li><span className="b-t"><strong>Write down the promotions you&rsquo;re already considering</strong> &mdash; even half-formed ones. We&rsquo;ll slot them into the calendar rather than starting from a blank page.</span></li>
        </ul>
        <p className="closer">Can&rsquo;t make it live? Register anyway &mdash; every registrant gets the replay.</p>
        </div>
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
