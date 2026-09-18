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
/** 11:00 to 12:30 — the ninety minutes the headline promises, exactly. */
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
 * How long it is, and what "built in 90 minutes" is actually promising.
 *
 * The number is in the headline, so it is a promise rather than a logistic, and
 * the promise has to survive the session. Ninety minutes cannot *finish* a
 * quarter's marketing, and a page that implies it will is a page whose attendees
 * leave feeling short-changed by a thing that went well.
 *
 * So the claim is scoped everywhere it appears: ninety minutes builds the
 * framework and makes the decisions, and the workbook is finished afterwards.
 * `EVENT_LENGTH_CLAIM` is that scoping in one line, and it is why the page can
 * keep a headline number without overpromising.
 */
export const EVENT_LENGTH = '90 minutes'
export const EVENT_LENGTH_LINE = '90 minutes'
export const EVENT_LENGTH_CLAIM =
  '90 minutes with us to build it. 90 minutes on your own to finish it.'

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
export const EVENT_TITLE = 'Your Q4 Profit Playbook, Built in 90 Minutes'

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
