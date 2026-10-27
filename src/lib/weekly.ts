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
 * Where the button goes: the payment page for eCommHarvest Weekly.
 *
 * A hosted payment link on the GoHighLevel side (a white-labelled
 * `api.<brand>/payment-link/…` address). It is a public URL, not a secret, which
 * is why it can live in source — and living here is what keeps a fresh database,
 * a local run and a seeded preview all pointing at the same place.
 *
 * **Two pages, one address.** `/join` and `/weekly` each keep their own copy of
 * it inside their pricing block, because that is where the builder edits it, so
 * "change the link" means changing two fields. Migration
 * `20261027_200000_weekly_checkout_link` fills both on the live site; after that
 * the builder's **Checkout URL** field is the one that counts, and it is never
 * overwritten by a deploy. If this constant and a page ever disagree, the page
 * wins — and `test:weekly` reports it, since two different payment destinations
 * on pages taking the same traffic is the failure that costs money.
 *
 * While it is empty the button renders as plainly unavailable rather than as a
 * link to nowhere: a dead join button on a page taking traffic loses the sale
 * quietly, and one that admits it is not ready tells you to go and paste the URL.
 *
 * **The price on the page must match the price behind this link.** Both pages say
 * `$100/month` from `WEEKLY_PRICE_LINE` above; the payment page is configured
 * separately, so a mismatch is invisible from this side. Check it by opening the
 * link, not by trusting either number.
 */
export const WEEKLY_CHECKOUT_URL =
  'https://api.shoqwave.com/payment-link/6aba788fbaea3cadef54fb37'
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
