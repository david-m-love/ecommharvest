import type { Metadata } from 'next'

import { RegisterForm } from './RegisterForm'

export const metadata: Metadata = {
  title: 'Your Q4 Revenue Playbook, Built in 90 Minutes',
  description:
    'Thursday, September 3 at 11:00 AM MT. A free 90-minute masterclass for LDS e-commerce founders. Build your Q4 promotional calendar, offers, email and SMS plan in one sitting — without headaches or sacrificing family time.',
  alternates: { canonical: '/masterclass' },
}

/**
 * The masterclass landing page, ported from the standalone static build.
 * Markup is the version that was verified in the browser; only the form became a
 * client component.
 */
export default function MasterclassPage() {
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

        <div className="slot hero">
        <div className="slot-in">
        <p className="badge">Free masterclass for LDS e-commerce founders</p>
        <h1>Your Q4 Revenue Playbook, Built in 90 Minutes.</h1>
        <p className="deck">&hellip;without headaches or sacrificing family time.</p>
        <p className="lede">Walk in with Q4 still scattered across notes, ideas, and half-finished plans. Walk out knowing what you&rsquo;re promoting, when you&rsquo;re promoting it, how you&rsquo;ll structure the offers, and what email, SMS, creative, and conversion systems need to be ready before the holiday rush.</p>
        <p className="when"><strong>Thursday, September 3 &middot; 11:00 AM MT</strong> <span className="when-tz">(1:00 PM ET / 10:00 AM PT)</span></p>
        <div className="cta-row">
        <a href="#register" className="btn btn-lg">Save my seat</a>
        <span className="cta-micro">Free &middot; 90 minutes &middot; replay available</span>
        </div>
        </div>
        </div>

        <div className="hostbar">
        <div className="hostbar-in">
        <p className="host-label">Hosted by</p>
        <div className="hosts">
        <a className="host" href="https://tiny3dtemples.com/" target="_blank" rel="noopener">
        <span className="host-mark" aria-hidden="true">T3T</span>
        <span className="host-name">Tiny 3D Temples</span>
        </a>
        <a className="host" href="https://bomsocks.com/" target="_blank" rel="noopener">
        <span className="host-mark" aria-hidden="true">BOM</span>
        <span className="host-name">B.O.M.Socks</span>
        </a>
        <a className="host" href="https://www.comefollowmefhe.com/" target="_blank" rel="noopener">
        <span className="host-mark" aria-hidden="true">CFM</span>
        <span className="host-name">Come Follow Me FHE</span>
        </a>
        </div>
        </div>
        </div>

        <div className="slot">
        <div className="slot-in">
        <div className="card-dark">
        <p className="eyebrow">Faith first, then strategy</p>
        <h2>What if your Q4 wasn&rsquo;t just built on strategy, but founded on faith first?</h2>
        <p>Q4 is the quarter that quietly eats December. The late-night inventory panic. The Sunday spent putting out fires. The school concert you half-watched from the parking lot while answering support tickets. Most founders accept that as the price of a good holiday season.</p>
        <p>It isn&rsquo;t. The scramble comes from deciding in November what should have been decided in September. When your promotional calendar, your offers, and your automated flows are planned early and built once, Q4 runs on systems instead of adrenaline &mdash; and your Sabbath, your ministering, and your family stay where they belong.</p>
        <p><strong>Faith first. Family second. Then a Q4 that funds both.</strong></p>
        </div>
        </div>
        </div>

        <div className="slot wash">
        <div className="slot-in">
        <p className="eyebrow">What you&rsquo;ll learn</p>
        <p className="leadin">We build it together. You leave with a plan you can execute:</p>
        <ul className="bullets">
        <li><span className="b-t"><strong>Your promotional calendar</strong> &mdash; what to run, when to run it, and how the promotions build on each other</span></li>
        <li><span className="b-t"><strong>Your offer strategy</strong> &mdash; including bundles, tiered discounts, gifts with purchase, thresholds, and other ways to sell beyond &ldquo;25% off&rdquo;</span></li>
        <li><span className="b-t"><strong>Your AOV plan</strong> &mdash; how to use those offers to encourage bigger baskets while protecting margin</span></li>
        <li><span className="b-t"><strong>Your email + SMS roadmap</strong> &mdash; the campaigns and must-have automated flows that support the quarter</span></li>
        <li><span className="b-t"><strong>Your Meta ads plan</strong> &mdash; where paid social sits in the calendar, which offers deserve spend, and how to scale without bidding against everyone else on the same three days</span></li>
        <li><span className="b-t"><strong>Your Q4 creative plan</strong> &mdash; what your ads need to communicate and the creative you&rsquo;ll need before you scale traffic</span></li>
        <li><span className="b-t"><strong>Your pre-Q4 fix list</strong> &mdash; the conversion and retention pieces to tighten before pouring more money into Meta</span></li>
        <li><span className="b-t"><strong>Your build-by date</strong> &mdash; what has to be finished before Thanksgiving so December runs on automation instead of your evenings</span></li>
        </ul>
        <div className="cta-row cta-row-2">
        <a href="#register" className="btn">Save my seat</a>
        <span className="cta-micro">Thursday, September 3 &middot; 11:00 AM MT &middot; replay available</span>
        </div>
        </div>
        </div>

        <div className="slot">
        <div className="slot-in">
        <p className="eyebrow">Where paid social fits</p>
        <h2>Your Meta ads don&rsquo;t need a bigger budget. They need the other two arms working.</h2>
        <p className="lede">Most Q4 plans treat paid social as the entire strategy: raise the budget in November and hope it clears. But your cost per acquisition isn&rsquo;t decided inside the ad account. It&rsquo;s decided by what happens after the click, and after the first order.</p>
        <div className="fbar">
        <p className="formula">Ads <span className="x">&times;</span> Offer <span className="x">&times;</span> Repeat <span className="x">=</span> the CAC you can afford</p>
        <p className="fbar-note">Each arm makes the other two cheaper</p>
        </div>
        <div className="cols-3">
        <div className="card">
        <h3>Paid social</h3>
        <p>What your Q4 creative has to communicate, which offers to put spend behind, and when to scale &mdash; so you&rsquo;re not paying peak CPMs for a message that was never going to convert.</p>
        </div>
        <div className="card">
        <h3>Offers &amp; AOV</h3>
        <p>A stronger offer lifts conversion rate, so the same clicks buy more customers. A bigger basket means you can afford to pay more for a customer than the competitor bidding beside you.</p>
        </div>
        <div className="card">
        <h3>Email &amp; SMS</h3>
        <p>The second and third order don&rsquo;t carry an ad cost. Flows and campaigns that bring buyers back are what pull your blended CAC down across the whole quarter.</p>
        </div>
        </div>
        <p className="closer">That compounding is the reason we build all three arms in one sitting instead of one at a time.</p>
        </div>
        </div>

        <div className="slot">
        <div className="slot-in">
        <p className="eyebrow">Who this is for</p>
        <h2>Built for founders running a real store and a real life.</h2>
        <p className="lede">If you&rsquo;re selling online, carrying a calling, and trying to grow without letting Q4 take over your home, you&rsquo;re in the right room.</p>
        <div className="cols-3">
        <div className="card">
        <h3>A store, not a hobby</h3>
        <p>You have products shipping and traffic coming in. Q4 genuinely matters to your number. What you don&rsquo;t have yet is the quarter mapped out on one page.</p>
        </div>
        <div className="card">
        <h3>Small team or solo</h3>
        <p>No CMO, no agency retainer. You&rsquo;re the strategist, the copywriter, and the one packing boxes &mdash; so the plan has to be something one person can actually execute.</p>
        </div>
        <div className="card">
        <h3>A calling and a family</h3>
        <p>Sundays aren&rsquo;t workdays. Weeknights belong to your kids. Any Q4 plan worth building has to respect both, and this one is designed around them.</p>
        </div>
        </div>
        </div>
        </div>

        <div className="slot wash">
        <div className="slot-in">
        <p className="eyebrow">Who you&rsquo;re learning from</p>
        <h2>Live with David Love and special guest Derek Crimin.</h2>
        <div className="speakers">
        <div className="speaker">
        <p className="sp-tag">Presenter</p>
        <div className="sp-top">
        <div className="sp-photo" aria-hidden="true">DL</div>
        <div>
        <p className="sp-name">David Love</p>
        <p className="sp-role">E-commerce growth strategist</p>
        </div>
        </div>
        <p>David spends his days on the unglamorous side of e-commerce growth &mdash; offer strategy, email and SMS, paid social, and the conversion work that turns existing traffic into more orders. Most of it comes down to decisions made before the quarter starts.</p>
        <p>He built this masterclass the way he builds Q4 for a store: one page, one calendar, and a hard build-by date.</p>
        </div>
        <div className="speaker">
        <p className="sp-tag">Special guest</p>
        <div className="sp-top">
        <div className="sp-photo" aria-hidden="true">DC</div>
        <div>
        <p className="sp-name">Derek Crimin</p>
        <p className="sp-role">Owner, B.O.M.Socks</p>
        </div>
        </div>
        <p>Derek owns and operates B.O.M.Socks, so he walks into Q4 as an operator rather than a theorist &mdash; same inventory calls, same ad costs, same deadline you&rsquo;re working against.</p>
        <p>He&rsquo;s joining to show what these plays look like inside a real store, and where the plan meets reality.</p>
        </div>
        </div>
        <div className="cta-row cta-row-2">
        <a href="#register" className="btn">Save my seat</a>
        <span className="cta-micro">Hosted by Tiny 3D Temples, B.O.M.Socks &amp; Come Follow Me FHE</span>
        </div>
        </div>
        </div>

        <div className="final-in" id="register">
        <div className="finalcard">
        <p className="eyebrow">Thursday, September 3 &middot; 11:00 AM MT &middot; free &middot; 90 minutes</p>
        <h2>Your Q4 Revenue Playbook, Built in 90 Minutes.</h2>
        <RegisterForm />
        </div>
        </div>

      </main>

      <footer>
        <div className="foot-in">
          <span>&copy; 2026 eCommHarvest</span>
          <nav className="foot-nav">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms &amp; Conditions</a>
          </nav>
          <span>Hosted by Tiny 3D Temples &middot; B.O.M.Socks &middot; Come Follow Me FHE</span>
        </div>
      </footer>
    </>
  )
}
