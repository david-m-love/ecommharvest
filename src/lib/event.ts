/**
 * When the masterclass is, in one place.
 *
 * The date has moved twice already, and finding every copy of it took a search
 * across the app, the calendar file, the structured data, two seeded pages and
 * four GoHighLevel blocks. Most of those are marketing copy and have to read
 * naturally, so they cannot all be generated — but every *machine-readable* one
 * can be, and those are the ones where being wrong is silent: a calendar entry
 * at the wrong hour, or a Google result advertising a date that has passed.
 *
 * So: the times below are the truth, the strings below are the wording, and
 * `test/event.test.ts` fails if any file still carries a date that disagrees.
 * Moving the masterclass again means editing this file and running
 * `npm run ghl:build`.
 *
 * **Mountain Time, written as "MT".** On 24 September the mountain states are on
 * MDT (UTC−6), not MST — so "MST" would be plainly wrong, and "MDT" reads as
 * jargon and invites the question it was meant to answer. "MT" is right all year
 * and is what an American audience reads without pausing. The bracket showing
 * Eastern and Pacific is what actually removes the confusion.
 */

/** The event, as the machines need it. Offset is MDT: UTC−6. */
export const EVENT_START_ISO = '2026-09-24T11:00:00-06:00'
/**
 * 11:00 to 12:30 — the working session and the Q&A together.
 *
 * The calendar entry covers both on purpose. Ending it at noon would free
 * everybody's diary exactly when the questions start, and the Q&A is the half a
 * founder with a real problem actually came for.
 */
export const EVENT_END_ISO = '2026-09-24T12:30:00-06:00'

/** The same instants in UTC, which is the only form an .ics file may use. */
export const EVENT_START_UTC = '20260924T170000Z'
export const EVENT_END_UTC = '20260924T183000Z'

/**
 * The calendar entry's identity, which is deliberately **not** the new date.
 *
 * Anyone who already added the old invitation has this UID sitting in their
 * calendar. Keep it and raise SEQUENCE and their calendar corrects the existing
 * entry in place; change it and they get a second entry at the new time with
 * the old one still there, at the hour they will actually turn up.
 */
export const EVENT_UID = 'q4-masterclass-2026-09-03@ecommharvest'
/**
 * Raise this by one whenever the time changes, or calendars ignore the update.
 * Raised for the rename too — an entry still reading "Q4 Revenue Playbook" in
 * somebody's calendar is the old name of the thing they are about to attend.
 */
export const EVENT_SEQUENCE = 3

/** The wording, as people read it. */
export const EVENT_DAY = 'Thursday, September 24'
export const EVENT_TIME = '11:00 AM MT'
/** Headline form: "Thursday, September 24 · 11:00 AM MT" */
export const EVENT_WHEN = `${EVENT_DAY} · ${EVENT_TIME}`
/** With the two timezones that stop half the audience doing arithmetic. */
export const EVENT_ELSEWHERE = '(1:00 PM ET / 10:00 AM PT)'

/**
 * How long it is, and what the number in the headline is promising.
 *
 * An hour and a half of wall-clock time, but **sixty** of those are the thing
 * being sold: a working session that ends with a Q4 plan. The rest is Q&A.
 *
 * That distinction is the whole reason the headline says sixty. Claiming the
 * full running time was defensible — the event really is that long — and
 * practically misleading, because a third of it is not building anything. A
 * headline number that does not survive contact with the agenda is a number the
 * audience discovers is wrong while they are sitting in the room.
 *
 * Sixty is also the easier ask. An hour is a meeting somebody can find; an hour
 * and a half is an afternoon they have to protect. The Q&A then reads as more
 * than was promised rather than as padding inside it.
 */
export const EVENT_LENGTH = '60 minutes'
export const EVENT_LENGTH_LINE = '60 minutes'
export const EVENT_QA_LENGTH = '30 minutes'

/**
 * The format, in one line, wherever it needs saying.
 *
 * Kept as a single string because it is the sentence that has to be identical in
 * six places — the hero, the final card, the calendar file, the structured data,
 * the registration page and the confirmation. Six hand-typed variants is how a
 * page ends up implying three different agendas.
 */
export const EVENT_FORMAT = '60-minute working masterclass + 30 minutes of live Q&A'
export const EVENT_LENGTH_CLAIM = '60 minutes to build it. 30 minutes to ask us anything.'

/**
 * The workbook.
 *
 * Named here because it is the one thing on the page that is *given* rather than
 * taught, and it is what makes the running time credible — the session is a
 * working session, and the workbook is the work. Every mention of it is a
 * promise somebody has to keep on the day.
 */
export const EVENT_WORKBOOK = 'Free live training. Workbook included.'

/**
 * "Profit", not "Revenue".
 *
 * It was the Q4 Revenue Playbook. Revenue is the number that feels like success
 * and the one a founder can buy with a discount; profit is the number the
 * session is actually about, and the allowable-acquisition-cost segment only
 * makes sense under that word.
 */
export const EVENT_TITLE = 'Your Q4 Profit Playbook, Built in 60 Minutes'

/**
 * When the "join the live masterclass" link appears, and when it stops.
 *
 * **Absolute instants, so the visitor's clock is never consulted.** These carry
 * the −06:00 offset Mountain Time is actually on that day, and comparing two
 * `Date`s compares moments, not calendar readings — so a visitor in London and a
 * visitor in Denver see the link appear at the same instant, with no timezone
 * conversion anywhere in the code. That is the whole reason there is no
 * `America/Denver` string in this file: the arithmetic that would need it has
 * already been done, once, here.
 *
 * Half an hour early, because people arrive early for things they paid
 * attention to. Two hours after the start, because the expensive failure is the
 * person who joins at 12:10 and finds the link gone — not the person who finds
 * it still there at 12:55.
 */
export const JOIN_OPENS_ISO = '2026-09-24T10:30:00-06:00'
export const JOIN_CLOSES_ISO = '2026-09-24T13:00:00-06:00'

/**
 * Whether the join link should be on the page right now.
 *
 * Takes `now` so it can be tested at a specific moment rather than only at the
 * moment the test runs — which for a window that opens once, on one morning, is
 * the difference between a test and a coin toss.
 */
export const isJoinWindowOpen = (now: Date = new Date()): boolean => {
  const time = now.getTime()
  return time >= Date.parse(JOIN_OPENS_ISO) && time < Date.parse(JOIN_CLOSES_ISO)
}

/**
 * The GoHighLevel form that takes registrations.
 *
 * The page is ours and the form is theirs: everything a visitor reads is edited
 * in the builder and styled by our design system, while the contact record, the
 * workflows and the email and SMS stay in GHL. Rebuilding the form here would
 * mean a second place for leads to land and a second consent record to
 * reconcile.
 *
 * The id is the last part of the embed code GHL gives you
 * (`.../widget/form/<this>`). Changing the form in GHL means pasting a new id
 * here, or into the block on the page — the block wins, so a page can use a
 * different form without a deploy.
 */
export const MASTERCLASS_FORM_ID = '4KbBmtflATgx2fMZiNYU'

/**
 * Where "Save my seat" goes: a page on this site, not the funnel.
 *
 * It used to be an absolute GoHighLevel URL. Keeping the visitor here means the
 * brand, the speakers and the reassurance are ours to edit, the analytics are on
 * one domain, and there is no hop to a second site in the middle of a funnel —
 * which is where people leave.
 */
export const REGISTER_PATH = '/masterclass/register'
export const THANKS_PATH = '/masterclass/thanks'

/**
 * The address the "Save my seat" buttons actually point at.
 *
 * A full URL naming a host, rather than the path above, because the two are no
 * longer the same answer. `REGISTER_PATH` is where the page *lives* — it is what
 * the canonical tag, the `/register` redirect and the sitemap are built from, and
 * it stays a path so each hostname describes itself. `REGISTER_URL` is where a
 * visitor is *sent*, and that is pinned to one host on purpose: a path would send
 * whoever is reading `app.ecommharvest.com/masterclass` to the app copy and
 * whoever is reading `ecommharvest.com/masterclass` to the public one, and the
 * funnel would be two funnels in the numbers.
 *
 * **`ecommharvest.com`, the public site.** Both hostnames serve this deployment,
 * so either would work — but `app.` is where the admin, the builder and the
 * member area live, and it is the host you are on while logged in, which makes it
 * the one you accidentally copy out of the address bar. A public campaign belongs
 * on the public domain: it is the name on the ads, and it keeps "app" meaning the
 * private half of the site.
 *
 * Not `go.ecommharvest.com` either. That is GoHighLevel, and the funnel moved off
 * it — only the form is still theirs, embedded in our page.
 *
 * `src/lib/href.ts` knows both of our hostnames are ours, which is what stops a
 * full address opening in a new tab.
 */
export const REGISTER_URL = 'https://ecommharvest.com/masterclass/register'

/**
 * Nested under the masterclass, not flat at `/register`.
 *
 * A funnel belongs to a campaign. `/register` can only ever be one thing, so the
 * day there is a second event it has to be taken from one of them; under the
 * masterclass, `/workshop/register` can exist beside it without an argument. It
 * also means the whole funnel is one prefix in analytics.
 *
 * `/register` keeps working — it is exactly the kind of short URL that ends up
 * in a message — as a permanent redirect set in `next.config.mjs`.
 */
export const OLD_FLAT_REGISTER_PATH = '/register'
