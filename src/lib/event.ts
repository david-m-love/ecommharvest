/**
 * When the masterclass is, in one place.
 *
 * The date has moved once already, and finding every copy of it took a search
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
 * **Mountain Time, written as "MT".** On 10 September the mountain states are on
 * MDT (UTC−6), not MST — so "MST" would be plainly wrong, and "MDT" reads as
 * jargon and invites the question it was meant to answer. "MT" is right all year
 * and is what an American audience reads without pausing. The bracket showing
 * Eastern and Pacific is what actually removes the confusion.
 */

/** The event, as the machines need it. Offset is MDT: UTC−6. */
export const EVENT_START_ISO = '2026-09-10T11:00:00-06:00'
export const EVENT_END_ISO = '2026-09-10T12:30:00-06:00'

/** The same instants in UTC, which is the only form an .ics file may use. */
export const EVENT_START_UTC = '20260910T170000Z'
export const EVENT_END_UTC = '20260910T183000Z'

/**
 * The calendar entry's identity, which is deliberately **not** the new date.
 *
 * Anyone who already added the old invitation has this UID sitting in their
 * calendar. Keep it and raise SEQUENCE and their calendar corrects the existing
 * entry in place; change it and they get a second entry at the new time with
 * the old one still there, at the hour they will actually turn up.
 */
export const EVENT_UID = 'q4-masterclass-2026-09-03@ecommharvest'
/** Raise this by one whenever the time changes, or calendars ignore the update. */
export const EVENT_SEQUENCE = 1

/** The wording, as people read it. */
export const EVENT_DAY = 'Thursday, September 10'
export const EVENT_TIME = '11:00 AM MT'
/** Headline form: "Thursday, September 10 · 11:00 AM MT" */
export const EVENT_WHEN = `${EVENT_DAY} · ${EVENT_TIME}`
/** With the two timezones that stop half the audience doing arithmetic. */
export const EVENT_ELSEWHERE = '(1:00 PM ET / 10:00 AM PT)'

export const EVENT_TITLE = 'Your Q4 Revenue Playbook, Built in 90 Minutes'
