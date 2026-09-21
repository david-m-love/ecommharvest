import React from 'react'

/* ============================================================================
   THE DECK'S CONTENT — edit this file to change what the masterclass says.
   ----------------------------------------------------------------------------
   Seventeen slides, in order, each one an entry in the array at the bottom.
   The words are here in plain JSX; the layout classes they use are in
   `src/styles/slides.css`. There is deliberately no CMS behind this: the deck is
   presented once, rewritten between rehearsals, and a page-builder screen for it
   would be more to maintain than the thing it manages. Change a line, save,
   refresh the browser.

   THREE THINGS WORTH KNOWING BEFORE EDITING

   1. Pictures. Every image on the deck is an entry in `ASSETS` below. Paste a
      URL next to the one you want to fill and the branded placeholder is
      replaced by the picture, in the same frame, on the next refresh. Nothing
      else has to change.

   2. Derek's slides — 13, 14 and 15 — are marked with `note:`. That note is
      shown in the jump grid (press G while presenting) and never on the slide
      itself, so the deck can be presented in this state without an audience
      reading "placeholder" off the screen.

   3. The brand is always eCommHarvest — lowercase e, capital C, two m's,
      capital H. Nothing in the stylesheet uppercases text, precisely so that
      this spelling survives: labels that read as capitals are typed as capitals
      here. Please keep it that way.
   ========================================================================== */

/**
 * Where the real pictures go.
 *
 * Empty string means "still a placeholder". Fill one in with any URL the site
 * can serve — an upload from Images & files is the easy one, and its address
 * looks like `/api/media/file/derek-crimmin.jpg`.
 */
export const ASSETS = {
  /** [DEREK VISUAL PLACEHOLDER] — slide 13, portrait, roughly 4:5. */
  derekPortrait: '',
  /** [IMAGE PLACEHOLDER: WORKBOOK PAGE] — slide 2, a page of the workbook. */
  workbookPage: '',
  /** [DEREK STORY / PRINCIPLE / VISUAL] — slide 15, whatever Derek brings. */
  derekPrinciple: '',
}

export type SlideTone = 'light' | 'cream' | 'wash' | 'dark'

export type Slide = {
  /** The name in the jump grid. Never rendered on the slide. */
  title: string
  tone?: SlideTone
  /**
   * An internal reminder — what is still unfinished about this slide. Shown in
   * the jump grid only, so it can never appear on a shared screen.
   */
  note?: string
  body: React.ReactNode
}

/* ---------------------------------------------------------------------------
   Small pieces the slides are built from.
   ------------------------------------------------------------------------- */

/**
 * A branded box standing in for a picture that does not exist yet.
 *
 * `label` is the token used to talk about it — it shows inside the box and is
 * left on the element as `data-placeholder`, so every outstanding asset can be
 * found in the page with one query. Give it a `src` and it becomes the picture,
 * in the same frame, with no other edit.
 *
 * A plain <img>, not next/image: the point is that any URL can be dropped in,
 * including one from a host the image optimiser has not been told about.
 */
export function Placeholder({
  label,
  src,
  alt,
  className = '',
}: {
  label: string
  src?: string
  alt?: string
  className?: string
}) {
  if (src)
    return (
      <div className={`sl-ph sl-ph-filled ${className}`} data-placeholder={label}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? ''} />
      </div>
    )
  return (
    <div className={`sl-ph ${className}`} data-placeholder={label}>
      <svg className="sl-ph-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="8.5" cy="10" r="1.7" stroke="currentColor" strokeWidth="1.4" />
        <path d="M3 17l5-4.5 4 3.5 3.5-3 5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      <p className="sl-ph-label">{label}</p>
    </div>
  )
}

/** The worksheet mark, used wherever the deck points at the workbook. */
function WorkbookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 3.5h10.5L19 7v13.5H5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M15 3.5V7h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 11.5h8M8 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/**
 * The workbook chip: slides 5, 8, 11 and 16.
 *
 * These are the four moments the presenter may stop teaching and screen-share
 * the workbook, so they carry the same marker every time. The slides teach; the
 * decisions get made in the workbook, and none of the workbook is duplicated
 * here.
 */
function Workbook({ children, large }: { children: React.ReactNode; large?: boolean }) {
  return (
    <p className={large ? 'sl-wb sl-wb-lg' : 'sl-wb'}>
      <WorkbookIcon />
      <span>WORKBOOK → {children}</span>
    </p>
  )
}

/**
 * One of the three demand shapes on slide 8.
 *
 * Drawn rather than charted, and said so on the slide: these are the shapes of
 * three common Q4 buying patterns, not a forecast of anybody's actual revenue.
 * A real chart here would be a claim the data cannot support.
 */
function Curve({ d }: { d: string }) {
  return (
    <svg className="sl-curve" viewBox="0 0 120 30" fill="none" aria-hidden="true">
      <path d={`${d} L118,28 L2,28 Z`} fill="currentColor" fillOpacity="0.12" />
      <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M2,28 H118" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.4" />
    </svg>
  )
}

function CurveAxis() {
  return (
    <div className="sl-curve-axis">
      <span>OCT</span>
      <span>NOV</span>
      <span>DEC</span>
      <span>JAN</span>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   The seventeen slides.
   ------------------------------------------------------------------------- */

export function deckSlides({ logoUrl }: { logoUrl?: string | null } = {}): Slide[] {
  return [
    /* ---- 1 ---------------------------------------------------------------- */
    {
      title: 'Your Q4 Profit Playbook',
      tone: 'cream',
      body: (
        <>
          <div className="sl-brand">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="eCommHarvest" />
            ) : (
              <span className="sl-brand-text">eCommHarvest</span>
            )}
          </div>
          <div className="sl-body sl-centre">
            <p className="sl-eyebrow">FREE LIVE MASTERCLASS</p>
            <h1 className="sl-h1 sl-h1-centre">Your Q4 Profit Playbook</h1>
            <p className="sl-lede sl-lede-centre">
              A working session for building a more profitable Q4.
            </p>
            <div className="sl-hosts">
              <p className="sl-hosts-label">HOSTED BY</p>
              <p className="sl-hosts-names">David Love + Derek Crimmin</p>
            </div>
          </div>
        </>
      ),
    },

    /* ---- 2 ---------------------------------------------------------------- */
    {
      title: 'What We’re Doing Today',
      body: (
        <>
          <h2 className="sl-h2">What We’re Doing Today</h2>
          <div className="sl-body">
            <div className="sl-cols sl-cols-2">
              <div className="sl-card sl-card-accent">
                <p className="sl-stat">
                  <span className="sl-stat-n">60</span>
                  <span className="sl-stat-u">MINUTES</span>
                </p>
                <p className="sl-stat-say">to make the important decisions.</p>
              </div>
              <div className="sl-card">
                <p className="sl-stat">
                  <span className="sl-stat-n">30</span>
                  <span className="sl-stat-u">MINUTES</span>
                </p>
                <p className="sl-stat-say">to help with your questions.</p>
              </div>
            </div>
          </div>
          <div className="sl-footrow">
            <div>
              <p className="sl-foot">
                You don’t need to finish every detail today.
                <br />
                <em>You need to leave knowing what to do next.</em>
              </p>
            </div>
            {/* Swap in a photograph of a workbook page by setting
                ASSETS.workbookPage at the top of this file. */}
            <Placeholder
              label="[IMAGE PLACEHOLDER: WORKBOOK PAGE]"
              src={ASSETS.workbookPage}
              alt="A page of the Q4 workbook"
              className="sl-ph-thumb"
            />
          </div>
        </>
      ),
    },

    /* ---- 3 ---------------------------------------------------------------- */
    {
      title: 'There Are Only 3 Ways a Store Grows',
      tone: 'cream',
      body: (
        <>
          <p className="sl-eyebrow">THE GROWTH EQUATION</p>
          <h2 className="sl-h2 sl-h2-wide">There Are Only 3 Ways an Ecommerce Store Grows.</h2>
          <div className="sl-body">
            <div className="sl-cols sl-cols-3">
              <div className="sl-card">
                <p className="sl-num">01</p>
                <p className="sl-ct">MORE CUSTOMERS</p>
                <p className="sl-cp">Acquire more buyers.</p>
              </div>
              <div className="sl-card">
                <p className="sl-num">02</p>
                <p className="sl-ct">BIGGER ORDERS</p>
                <p className="sl-cp">Increase average order value.</p>
              </div>
              <div className="sl-card">
                <p className="sl-num">03</p>
                <p className="sl-ct">MORE PURCHASES</p>
                <p className="sl-cp">Get customers to buy again.</p>
              </div>
            </div>
          </div>
          <p className="sl-foot">
            Every Q4 tactic should pull <em>one or more of these levers</em>.
          </p>
        </>
      ),
    },

    /* ---- 4 ---------------------------------------------------------------- */
    {
      title: 'How Do We Pull Those Levers?',
      tone: 'dark',
      body: (
        <>
          <p className="sl-eyebrow">THE eCommHarvest FRAMEWORK</p>
          <h2 className="sl-h2 sl-h2-wide">How Do We Pull Those Levers?</h2>
          <div className="sl-body">
            <p className="sl-eq">
              <span>GOOD SOIL</span>
              <span className="sl-eq-x">×</span>
              <span>GOOD SEED</span>
              <span className="sl-eq-x">×</span>
              <span>CONSISTENT NURTURE</span>
            </p>
            <div className="sl-cols sl-cols-3 sl-cols-tight">
              <div>
                <p className="sl-ct sl-ct-sm">GOOD SOIL</p>
                <p className="sl-cp">A product, offer and buying experience people want to say yes to.</p>
              </div>
              <div>
                <p className="sl-ct sl-ct-sm">GOOD SEED</p>
                <p className="sl-cp">The right people discovering the right message.</p>
              </div>
              <div>
                <p className="sl-ct sl-ct-sm">CONSISTENT NURTURE</p>
                <p className="sl-cp">What happens after we earn their attention.</p>
              </div>
            </div>
          </div>
          <p className="sl-foot">
            Growth becomes easier to understand when you stop treating marketing like a collection
            of tricks.
          </p>
        </>
      ),
    },

    /* ---- 5 ---------------------------------------------------------------- */
    {
      title: 'Is Your Business Ready for Q4?',
      body: (
        <>
          <h2 className="sl-h2">Is Your Business Ready for Q4?</h2>
          <div className="sl-body">
            <div className="sl-cols sl-cols-3">
              <div className="sl-card">
                <p className="sl-ct sl-ct-sm">GOOD SOIL</p>
                <ul className="sl-list">
                  <li>Product people want</li>
                  <li>Offer</li>
                  <li>Website / CRO</li>
                  <li>Social proof</li>
                  <li>Economics</li>
                </ul>
              </div>
              <div className="sl-card">
                <p className="sl-ct sl-ct-sm">GOOD SEED</p>
                <ul className="sl-list">
                  <li>Audience</li>
                  <li>Messaging</li>
                  <li>Creative</li>
                  <li>Traffic</li>
                  <li>List growth</li>
                </ul>
              </div>
              <div className="sl-card">
                <p className="sl-ct sl-ct-sm">CONSISTENT NURTURE</p>
                <ul className="sl-list">
                  <li>Capture</li>
                  <li>Core flows</li>
                  <li>Campaigns</li>
                  <li>Follow-up</li>
                  <li>Retention</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="sl-footrow">
            <p className="sl-foot sl-redline">Anything RED becomes urgent pre-Q4 work.</p>
            <Workbook>Q4 Readiness Audit</Workbook>
          </div>
        </>
      ),
    },

    /* ---- 6 ---------------------------------------------------------------- */
    {
      title: 'How Much Can You Afford to Pay for a Customer?',
      tone: 'cream',
      body: (
        <>
          <p className="sl-eyebrow">KNOW YOUR NUMBERS</p>
          <h2 className="sl-h2 sl-h2-xs sl-h2-wide">
            How Much Can You Afford to Pay for a Customer?
          </h2>
          <div className="sl-body">
            <div className="sl-stack">
              <div className="sl-row">
                <span className="sl-op" />
                <span className="sl-term">AVERAGE ORDER VALUE</span>
              </div>
              <div className="sl-row">
                <span className="sl-op">−</span>
                <span className="sl-term">PRODUCT COST</span>
              </div>
              <div className="sl-row">
                <span className="sl-op">−</span>
                <span className="sl-term">FULFILLMENT / SHIPPING</span>
              </div>
              <div className="sl-row">
                <span className="sl-op">−</span>
                <span className="sl-term">VARIABLE COSTS</span>
              </div>
              <div className="sl-row sl-row-sum">
                <span className="sl-op">=</span>
                <span className="sl-term">CONTRIBUTION BEFORE ADVERTISING</span>
              </div>
              <div className="sl-row">
                <span className="sl-op">−</span>
                <span className="sl-term">DESIRED FIRST-ORDER PROFIT</span>
              </div>
              <div className="sl-row sl-row-total">
                <span className="sl-op">=</span>
                <span className="sl-term">TARGET ALLOWABLE CAC</span>
              </div>
            </div>
          </div>
        </>
      ),
    },

    /* ---- 7 ---------------------------------------------------------------- */
    {
      title: 'Break-Even CAC ≠ Target CAC',
      tone: 'dark',
      body: (
        <>
          <h2 className="sl-h2">Break-Even CAC ≠ Target CAC</h2>
          <div className="sl-body">
            <div className="sl-split">
              <div className="sl-stack sl-stack-wide">
                <div className="sl-row">
                  <span className="sl-op" />
                  <span className="sl-term">Average order</span>
                  <span className="sl-val">$100</span>
                </div>
                <div className="sl-row">
                  <span className="sl-op">−</span>
                  <span className="sl-term">Product cost</span>
                  <span className="sl-val">$30</span>
                </div>
                <div className="sl-row">
                  <span className="sl-op">−</span>
                  <span className="sl-term">Fulfillment / shipping</span>
                  <span className="sl-val">$10</span>
                </div>
                <div className="sl-row">
                  <span className="sl-op">−</span>
                  <span className="sl-term">Variable costs</span>
                  <span className="sl-val">$3</span>
                </div>
                <div className="sl-row sl-row-sum">
                  <span className="sl-op">=</span>
                  <span className="sl-term">Available before advertising</span>
                  <span className="sl-val">$57</span>
                </div>
              </div>
              <div className="sl-answer">
                <p className="sl-answer-q">Want $20 of first-order contribution profit?</p>
                <p className="sl-answer-sum">$57 − $20</p>
                <p className="sl-answer-label">TARGET CAC</p>
                <p className="sl-answer-n">$37</p>
              </div>
            </div>
          </div>
        </>
      ),
    },

    /* ---- 8 ---------------------------------------------------------------- */
    {
      title: 'When Does YOUR Customer Want to Buy?',
      body: (
        <>
          <p className="sl-eyebrow">YOUR Q4 CUSTOMER</p>
          <h2 className="sl-h2 sl-h2-xs sl-h2-wide">
            When Does YOUR Customer Actually Want to Buy?
          </h2>
          <div className="sl-body">
            <div className="sl-cols sl-cols-3">
              <div className="sl-card">
                {/* [VISUAL PLACEHOLDER: Q4 DEMAND CURVES] — drawn in CSS/SVG rather
                    than charted, because these are shapes, not anybody's data. */}
                <Curve d="M2,27 C 20,26 34,23 50,19 C 62,16 70,6 78,5 C 88,4 98,14 108,22" />
                <CurveAxis />
                <p className="sl-ct sl-ct-sm">GIFT-LED</p>
                <p className="sl-cp">Peaks around major gifting / Black Friday buying.</p>
              </div>
              <div className="sl-card">
                <Curve d="M2,22 C 16,21 28,23 42,22 C 56,21 66,24 78,24 C 90,24 98,19 106,11 C 110,7 114,5 118,4" />
                <CurveAxis />
                <p className="sl-ct sl-ct-sm">SELF-PURCHASE</p>
                <p className="sl-cp">Can rebound strongly after Christmas.</p>
              </div>
              <div className="sl-card">
                <Curve d="M2,26 C 20,25 36,24 52,23 C 66,22 78,19 88,11 C 91,8 94,5 96,4 C 100,7 104,17 110,24" />
                <CurveAxis />
                <p className="sl-ct sl-ct-sm">OCCASION / DEADLINE-LED</p>
                <p className="sl-cp">
                  Purchase urgency peaks around arrival / shipping deadlines.
                </p>
              </div>
            </div>
          </div>
          <div className="sl-footrow">
            <div>
              <p className="sl-foot">
                Your calendar should follow <em>your buyer</em> — not somebody else’s Black
                Friday template.
              </p>
              <p className="sl-foot-2">Illustrative patterns, not forecasts.</p>
            </div>
            <Workbook>Identify Your Q4 Demand Pattern</Workbook>
          </div>
        </>
      ),
    },

    /* ---- 9 ---------------------------------------------------------------- */
    {
      title: 'A Promotion ≠ A Discount',
      tone: 'wash',
      body: (
        <>
          <h2 className="sl-h2">A Promotion ≠ A Discount</h2>
          <div className="sl-body">
            <div className="sl-menu">
              <span className="sl-tile">% OFF</span>
              <span className="sl-tile">$ OFF</span>
              <span className="sl-tile sl-tile-gold">BUNDLES</span>
              <span className="sl-tile">SPEND MORE / SAVE MORE</span>
              <span className="sl-tile">GIFT WITH PURCHASE</span>
              <span className="sl-tile">FREE SHIPPING</span>
              <span className="sl-tile sl-tile-gold">VIP / EARLY ACCESS</span>
              <span className="sl-tile">LIMITED EDITION</span>
              <span className="sl-tile">BUY X / GET Y</span>
              <span className="sl-tile">GIFT-CARD BONUS</span>
            </div>
          </div>
          <p className="sl-foot sl-foot-big">What behavior are we trying to create?</p>
        </>
      ),
    },

    /* ---- 10 --------------------------------------------------------------- */
    {
      title: 'Q4 Is a Series of Buying Windows',
      body: (
        <>
          <p className="sl-eyebrow">YOUR Q4 CALENDAR</p>
          <h2 className="sl-h2">Q4 Is a Series of Buying Windows.</h2>
          <div className="sl-body">
            <div className="sl-time">
              <div className="sl-stop">
                <span className="sl-dot" />
                <p className="sl-stop-label">PREPARE + GROW THE LIST</p>
                <p className="sl-stop-when">SEPT–OCT</p>
              </div>
              <div className="sl-stop">
                <span className="sl-dot" />
                <p className="sl-stop-label">EARLY Q4</p>
                <p className="sl-stop-when">OCT–EARLY NOV</p>
              </div>
              <div className="sl-stop">
                <span className="sl-dot" />
                <p className="sl-stop-label">EARLY BLACK FRIDAY / VIP</p>
                <p className="sl-stop-when">MID NOV</p>
              </div>
              <div className="sl-stop">
                <span className="sl-dot" />
                <p className="sl-stop-label">BLACK FRIDAY + CYBER WEEKEND</p>
                <p className="sl-stop-when">LATE NOV</p>
              </div>
              <div className="sl-stop">
                <span className="sl-dot" />
                <p className="sl-stop-label">GIFTING</p>
                <p className="sl-stop-when">EARLY DEC</p>
              </div>
              <div className="sl-stop">
                <span className="sl-dot" />
                <p className="sl-stop-label">SHIPPING DEADLINE</p>
                <p className="sl-stop-when">MID DEC</p>
              </div>
              <div className="sl-stop">
                <span className="sl-dot" />
                <p className="sl-stop-label">POST-CHRISTMAS + NEW YEAR</p>
                <p className="sl-stop-when">DEC 26–JAN</p>
              </div>
            </div>
          </div>
          <p className="sl-foot">
            Not every brand needs every window.
            <br />
            <em>Your job is to decide which ones belong in YOUR plan.</em>
          </p>
        </>
      ),
    },

    /* ---- 11 --------------------------------------------------------------- */
    {
      title: 'Build Each Window',
      note: 'The hand-off slide — screen-share the workbook here.',
      body: (
        <>
          <h2 className="sl-h2">Build Each Window</h2>
          <div className="sl-body">
            <div className="sl-cols sl-cols-3 sl-cols-fields">
              <div className="sl-field">
                <p className="sl-field-q">WHEN?</p>
                <span className="sl-rule" />
              </div>
              <div className="sl-field">
                <p className="sl-field-q">WHAT ARE WE SELLING?</p>
                <span className="sl-rule" />
              </div>
              <div className="sl-field">
                <p className="sl-field-q">WHO IS IT FOR?</p>
                <span className="sl-rule" />
              </div>
              <div className="sl-field">
                <p className="sl-field-q">WHAT’S THE OFFER?</p>
                <span className="sl-rule" />
              </div>
              <div className="sl-field">
                <p className="sl-field-q">WHERE WILL WE PROMOTE IT?</p>
                <span className="sl-rule" />
              </div>
              <div className="sl-field">
                <p className="sl-field-q">WHAT NEEDS TO BE CREATED?</p>
                <span className="sl-rule" />
              </div>
            </div>
          </div>
          <Workbook large>This is where your Q4 calendar starts taking shape.</Workbook>
        </>
      ),
    },

    /* ---- 12 --------------------------------------------------------------- */
    {
      title: 'Don’t Send One Email. Build a Campaign.',
      tone: 'dark',
      body: (
        <>
          <p className="sl-eyebrow">CONSISTENT NURTURE</p>
          <h2 className="sl-h2 sl-h2-wide">Don’t Send One Email. Build a Campaign.</h2>
          <div className="sl-body">
            <div className="sl-flow">
              <span className="sl-step">
                <span className="sl-step-n">01</span>
                TEASE
              </span>
              <span className="sl-arrow">→</span>
              <span className="sl-step">
                <span className="sl-step-n">02</span>
                LAUNCH
              </span>
              <span className="sl-arrow">→</span>
              <span className="sl-step">
                <span className="sl-step-n">03</span>
                EXPLAIN
              </span>
              <span className="sl-arrow">→</span>
              <span className="sl-step">
                <span className="sl-step-n">04</span>
                PROOF
              </span>
              <span className="sl-arrow">→</span>
              <span className="sl-step">
                <span className="sl-step-n">05</span>
                REMINDER
              </span>
              <span className="sl-arrow">→</span>
              <span className="sl-step">
                <span className="sl-step-n">06</span>
                URGENCY
              </span>
              <span className="sl-arrow">→</span>
              <span className="sl-step sl-step-last">
                <span className="sl-step-n">07</span>
                LAST CHANCE
              </span>
            </div>
            <p className="sl-note sl-note-centre">EMAIL + SMS</p>
          </div>
          <p className="sl-foot">
            Another email doesn’t mean saying the same thing again.
            <br />
            <em>Each message gives the customer another reason to care.</em>
          </p>
        </>
      ),
    },

    /* ---- 13 --------------------------------------------------------------- */
    {
      /* [DEREK SLIDE — the transition into his section. The words are David's
         draft; Derek may want his own.] */
      title: 'The Business Isn’t the Only Thing You’re Building',
      tone: 'dark',
      note: 'DEREK SLIDE — confirm wording with Derek. Portrait still a placeholder.',
      body: (
        <div className="sl-body">
          <div className="sl-split sl-split-portrait">
            <div>
              <p className="sl-eyebrow">THE FOUNDER</p>
              <h2 className="sl-h2">The Business Isn’t the Only Thing You’re Building.</h2>
              <p className="sl-lede">
                A stronger business also requires continued development of the person leading it.
              </p>
              <div className="sl-speaker">
                <p className="sl-hosts-label">SPEAKER</p>
                <p className="sl-hosts-names">Derek Crimmin</p>
              </div>
            </div>
            {/* Swap in a photo by setting ASSETS.derekPortrait at the top of this file. */}
            <Placeholder
              label="[DEREK VISUAL PLACEHOLDER]"
              src={ASSETS.derekPortrait}
              alt="Derek Crimmin"
              className="sl-ph-portrait"
            />
          </div>
        </div>
      ),
    },

    /* ---- 14 --------------------------------------------------------------- */
    {
      /* [DEREK SLIDE — REPLACE WITH DEREK'S FINAL FRAMEWORK]
         The five words below are a stand-in so the deck has a shape to discuss.
         Expect to replace the whole slide, not just edit the labels. */
      title: 'Building the Founder',
      tone: 'light',
      note: 'DEREK SLIDE — REPLACE WITH DEREK’S FINAL FRAMEWORK.',
      body: (
        <>
          <h2 className="sl-h2">Building the Founder</h2>
          <div className="sl-body">
            <div className="sl-cols sl-cols-5">
              {['SPIRITUAL', 'PHYSICAL', 'MENTAL', 'RELATIONSHIPS', 'BUSINESS'].map((pillar, i) => (
                <div className="sl-card sl-pillar" key={pillar}>
                  <p className="sl-num">0{i + 1}</p>
                  <p className="sl-ct sl-ct-sm">{pillar}</p>
                  <span className="sl-rule" />
                </div>
              ))}
            </div>
          </div>
        </>
      ),
    },

    /* ---- 15 --------------------------------------------------------------- */
    {
      /* [DEREK SLIDE — REPLACE AFTER CONTENT IS PROVIDED]
         Both the placeholder block and the takeaway line below are stand-ins. */
      title: 'A Principle Worth Carrying Into Q4',
      tone: 'cream',
      note: 'DEREK SLIDE — REPLACE AFTER CONTENT IS PROVIDED. Takeaway line is a stand-in.',
      body: (
        <>
          <h2 className="sl-h2">A Principle Worth Carrying Into Q4</h2>
          <div className="sl-body">
            <Placeholder
              label="[DEREK STORY / PRINCIPLE / VISUAL]"
              src={ASSETS.derekPrinciple}
              className="sl-ph-block"
            />
          </div>
          <p className="sl-foot sl-foot-centre">
            Better inputs <em>→</em> Better founder <em>→</em> Better leadership
          </p>
        </>
      ),
    },

    /* ---- 16 --------------------------------------------------------------- */
    {
      title: 'Your Next 90 Minutes',
      tone: 'wash',
      body: (
        <>
          <p className="sl-eyebrow">DON’T JUST TAKE NOTES</p>
          <h2 className="sl-h2">Your Next 90 Minutes</h2>
          <div className="sl-body">
            <div className="sl-cols sl-cols-3">
              <div className="sl-card sl-card-accent">
                <p className="sl-num">01</p>
                <p className="sl-ct">FINISH</p>
                <p className="sl-cp">Which decisions are still incomplete?</p>
              </div>
              <div className="sl-card">
                <p className="sl-num">02</p>
                <p className="sl-ct">BUILD</p>
                <p className="sl-cp">
                  What campaigns, pages, creative or assets still need to be created?
                </p>
              </div>
              <div className="sl-card">
                <p className="sl-num">03</p>
                <p className="sl-ct">ASSIGN</p>
                <p className="sl-cp">Who owns each task, and by when?</p>
              </div>
            </div>
          </div>
          <div className="sl-footrow">
            <p className="sl-foot">
              The goal isn’t more ideas.
              <br />
              <em>It’s a plan that gets executed.</em>
            </p>
            <Workbook>Final Action Plan</Workbook>
          </div>
        </>
      ),
    },

    /* ---- 17 --------------------------------------------------------------- */
    {
      title: 'What Are You Stuck On?',
      tone: 'dark',
      body: (
        <div className="sl-body sl-centre">
          <h2 className="sl-h2 sl-h2-centre">What Are You Stuck On?</h2>
          <p className="sl-lede sl-lede-centre">Live Q&amp;A with David + Derek</p>
          <div className="sl-chips">
            <span className="sl-chip">ADS</span>
            <span className="sl-chip">EMAIL / SMS</span>
            <span className="sl-chip">CREATIVE</span>
            <span className="sl-chip">OFFERS</span>
            <span className="sl-chip">CONVERSION</span>
            <span className="sl-chip">PROFITABILITY</span>
            <span className="sl-chip">PLANNING</span>
            <span className="sl-chip">ANYTHING Q4</span>
          </div>
          <p className="sl-foot sl-foot-centre">
            Ask the question that’s <em>actually keeping you stuck</em>.
          </p>
        </div>
      ),
    },
  ]
}
