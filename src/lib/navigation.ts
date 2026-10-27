/**
 * Telling a link somebody clicked from a request somebody is attacking with.
 *
 * Its own file with no imports, like `join-live.ts`, because the rule is a
 * security decision and should be checkable without a server.
 *
 * **The problem.** Payload only trusts a session cookie on a page request that
 * has no `Origin` header when the browser reports `Sec-Fetch-Site` as
 * same-origin, same-site or none. A link clicked in an email, a Slack message, a
 * GoHighLevel campaign or a search result is a *cross-site* navigation, so every
 * such click arrived signed out — with a perfectly valid cookie, which Payload
 * then threw away. For a members' area that is the normal way in: the reminder
 * email links to `/community`, and the member lands on a login form.
 *
 * **Why it is safe to relax, for these requests only.** The check exists to stop
 * another site riding a member's cookie. But the session cookie is
 * `SameSite=Lax`, which already means a browser will not send it on a cross-site
 * fetch, iframe, image or form POST. The one cross-site request that still
 * carries it is a top-level navigation — somebody following a link — and that is
 * a GET for a document the other site cannot read (it is not framed: every page
 * sends `X-Frame-Options: SAMEORIGIN`). A page that has no side effects on GET
 * has nothing to lose by being reachable from a link.
 *
 * So this recognises exactly that request and nothing wider:
 *
 *   - `Sec-Fetch-Mode: navigate` and `Sec-Fetch-Dest: document` — a top-level
 *     page load. An iframe is `dest: iframe`; `fetch()` is `mode: cors`; an
 *     image or script is neither.
 *   - **No `Origin` header.** Browsers attach one to every cross-site POST, so
 *     this is what keeps a forged form submission out even though it is also a
 *     "navigation".
 *
 * Anything else goes to Payload's own check untouched.
 */
export const isTopLevelNavigation = (header: (name: string) => string | null): boolean =>
  header('sec-fetch-mode') === 'navigate' &&
  header('sec-fetch-dest') === 'document' &&
  !header('origin')
