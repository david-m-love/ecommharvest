/**
 * Conversion events, for the ad account.
 *
 * Deliberately three lines. `window.fbq` only exists when
 * `src/components/MetaPixel.tsx` has injected it, and that only happens when
 * `trackingDecision()` allowed it — so a visitor in the UK who has not accepted,
 * or anyone sending Global Privacy Control, simply has no `fbq` and this becomes
 * a no-op. **The consent gate is the absence of the function**, which is a
 * better guarantee than a flag this code could read wrongly.
 *
 * Page views are already covered twice over — `<Analytics />` from Vercel and
 * the pixel's own `PageView` — so the only thing left worth firing by hand is
 * the moment somebody leaves for the checkout.
 */
export const track = (event: string, params?: Record<string, unknown>): void => {
  if (typeof window === 'undefined') return
  try {
    window.fbq?.('track', event, params)
  } catch {
    // Measurement must never be the reason a button does not work.
  }
}

/**
 * Somebody clicked through to the order form.
 *
 * The last event this site can see. The form is GoHighLevel's, on their domain,
 * so the purchase itself has to be reported by their pixel or their Conversions
 * API — there is no arrangement of code here that can observe it.
 */
export const trackCheckoutClick = (where: string): void =>
  track('InitiateCheckout', { content_name: 'eCommHarvest Weekly', content_category: where })
