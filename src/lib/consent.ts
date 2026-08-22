import { headers } from 'next/headers'

/**
 * Whether an advertising pixel may load for this visitor, and on what terms.
 *
 * The privacy policy makes a specific promise, so the code has to keep it. Three
 * rules, in order:
 *
 *  1. **A Global Privacy Control signal is honoured everywhere.** A browser that
 *     sends `Sec-GPC: 1` is making a legally recognised opt-out request under
 *     several US state laws, and it is the cleanest signal there is: no banner,
 *     no ambiguity, and it costs nothing to respect.
 *  2. **In the UK, the EEA and Switzerland, consent is required first.** Those
 *     regimes are opt-in for advertising cookies, so nothing loads until the
 *     visitor accepts.
 *  3. **Everywhere else it loads**, with opt-out routes named in the policy.
 *
 * Geography comes from the hosting platform's own header — Vercel resolves it at
 * the edge, and it is the only source available server-side without shipping an
 * IP database. When it is absent (locally, or another host), the answer is "ask
 * first": the cautious side of a promise is the right side to be wrong on.
 */

/**
 * The EEA, the UK and Switzerland.
 *
 * Written out rather than inferred, because "is this country in the EEA" has no
 * runtime answer and a wrong list is a compliance problem rather than a bug.
 */
const CONSENT_REQUIRED = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES',
  'SE', // EU
  'IS', 'LI', 'NO', // EEA
  'GB', 'CH', // UK, Switzerland
])

export type TrackingDecision =
  /** Load it now. */
  | { mode: 'allowed' }
  /** Ask first; load only if the visitor accepts. */
  | { mode: 'ask' }
  /** Do not load, and do not ask — the visitor has already said no. */
  | { mode: 'refused'; reason: 'gpc' }

export const trackingDecision = async (): Promise<TrackingDecision> => {
  const h = await headers()

  // Sec-GPC is the standardised header; DNT is the older one and costs nothing
  // to honour alongside it.
  if (h.get('sec-gpc') === '1' || h.get('dnt') === '1') return { mode: 'refused', reason: 'gpc' }

  const country = h.get('x-vercel-ip-country')?.toUpperCase()
  if (!country) return { mode: 'ask' }
  return CONSENT_REQUIRED.has(country) ? { mode: 'ask' } : { mode: 'allowed' }
}
