/**
 * eCommHarvest Weekly — the product facts, in one place.
 *
 * Two pages sell this membership: `/join`, the short page, and `/weekly`, the
 * long one. They will be edited on different days by somebody in a hurry, and
 * the failure that costs money is not a typo — it is the two pages quietly
 * disagreeing about the price while both are taking traffic.
 *
 * So the price, the name and the button live here, and the seed reads them.
 * Same reasoning as `src/lib/event.ts`, which exists because a date got into
 * eleven files.
 */

export const WEEKLY_NAME = 'eCommHarvest Weekly'

/**
 * Price as three parts, because the pricing card sets them at different sizes
 * and a single "$100/month" string cannot be typeset.
 */
export const WEEKLY_PRICE = '$100'
export const WEEKLY_INTERVAL = '/month'
export const WEEKLY_PRICE_LINE = `${WEEKLY_PRICE}${WEEKLY_INTERVAL}`

export const WEEKLY_CTA = `Join ${WEEKLY_NAME}`
/** With the price in it, for the hero and the closing card. */
export const WEEKLY_CTA_PRICED = `${WEEKLY_CTA} — ${WEEKLY_PRICE_LINE}`

export const WEEKLY_MICRO = 'Cancel anytime.'
export const WEEKLY_TERMS = 'Recurring monthly membership. Cancel anytime.'

/**
 * Where the button goes. **Empty on purpose.**
 *
 * The real address is a GoHighLevel order form, and it is pasted into the
 * pricing block in the builder — not committed here — so it can change without
 * a deploy, exactly like the live webinar link.
 *
 * While it is empty the button renders as plainly unavailable rather than as a
 * link to nowhere. A dead join button on a page taking traffic is worse than a
 * button that admits it is not ready: one loses the sale quietly, the other
 * tells you to go and paste the URL.
 */
export const WEEKLY_CHECKOUT_URL = ''
/** Shown in place of the button until somebody pastes one. */
export const WEEKLY_CHECKOUT_MISSING = 'Joining opens shortly.'

export const WEEKLY_PATH = '/weekly'
export const JOIN_PATH = '/join'

/**
 * The share card. No date — this is a membership, not an event, so the picture
 * carries the promise and the price instead of a "Thursday".
 */
export const WEEKLY_SOCIAL = {
  kicker: 'For LDS e-commerce founders',
  when: `${WEEKLY_PRICE_LINE} · Cancel anytime`,
}

/**
 * The one-line promise, used as the page title and the share headline.
 *
 * "In your corner" rather than "for hire": the thing being sold is access to
 * somebody who has run these businesses, and the whole positioning falls over if
 * it reads like an agency retainer or a course.
 */
export const WEEKLY_TITLE = 'A Fractional CMO in Your Corner — Every Week'
