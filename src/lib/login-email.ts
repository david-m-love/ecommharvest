/**
 * The sign-in email.
 *
 * Its own file with no imports, like `join-live.ts` and `membership.ts`, for the
 * same reason: this is the most-read text the product sends — for most members
 * it is the *only* thing they ever receive from us — and it should be
 * assertable without standing up Postgres first.
 *
 * Three decisions worth keeping:
 *
 *   1. **A text part as well as HTML.** Not politeness. An HTML-only message
 *      scores worse with spam filters, and a plain-text client renders it as
 *      nothing at all — which for a login email means locked out with no
 *      explanation.
 *   2. **The raw URL is printed under the button.** Buttons get stripped by
 *      corporate mail rewriters, fail to tap, or render as a blank gap in older
 *      clients. A visible address is the escape hatch, and it costs one line.
 *   3. **The expiry is derived, never typed.** `TOKEN_TTL_MS` decides when the
 *      token dies; if the email claimed a different number it would be lying to
 *      somebody at the exact moment they were already confused.
 */

/** How long a token lives. The single source for both the store and the copy. */
export const TOKEN_TTL_MS = 15 * 60 * 1000

export const expiryPhrase = (ttlMs: number = TOKEN_TTL_MS): string => {
  const minutes = Math.round(ttlMs / 60_000)
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}

/** Brand colours, inlined — an email has no stylesheet to read. */
const GOLD = '#C99132'
const NAVY = '#16324F'
const BROWN = '#45331B'
const MUTED = '#4E627A'
const LINE = '#DCE5EC'

/**
 * Escapes a URL for safe interpolation into an attribute.
 *
 * The link is built by us from a base-64url token, so it has nothing dangerous
 * in it today. This is here so that stays true if the `next` parameter ever
 * reaches the address: an email template is exactly the place where a quote in
 * the wrong spot stops being a typo and starts being a redirect somebody else
 * chose.
 */
const attr = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export type LoginEmail = { subject: string; html: string; text: string }

export const loginEmail = (link: string, ttlMs: number = TOKEN_TTL_MS): LoginEmail => {
  const expiry = expiryPhrase(ttlMs)
  const safe = attr(link)

  /**
   * Table-based button.
   *
   * Outlook on Windows renders through Word, which ignores padding on an
   * anchor — a CSS-only button collapses there to underlined text with no
   * target to hit. A single-cell table with the padding on the `<td>` is the
   * shape that survives it, and it degrades to a plain link everywhere else.
   */
  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#FBF8F3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBF8F3;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#FFFFFF;border:1px solid ${LINE};border-radius:16px;">
          <tr>
            <td style="padding:32px 32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

              <p style="margin:0 0 20px;font-size:17px;line-height:1.55;color:${BROWN};">
                Here is your link to sign in to eCommHarvest.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
                <tr>
                  <td align="center" bgcolor="${GOLD}" style="border-radius:999px;">
                    <a href="${safe}" style="display:inline-block;padding:14px 30px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;">Sign in to eCommHarvest</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:${MUTED};">
                Button not working? Paste this into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;">
                <a href="${safe}" style="color:${NAVY};">${safe}</a>
              </p>

              <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:${MUTED};">
                It works once and expires in ${expiry}.
              </p>

              <p style="margin:0;padding-top:20px;border-top:1px solid ${LINE};font-size:13px;line-height:1.55;color:${MUTED};">
                If you didn’t ask for this, you can ignore this email — nobody can sign in without the link above.
              </p>

            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:${MUTED};">
          eCommHarvest · a trading name of Love Your Marketing LLC
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`

  /**
   * The URL sits alone on its own line with nothing punctuating it.
   *
   * Mail clients auto-link plain text by scanning to the next space, so a
   * trailing full stop or a wrapping bracket gets swallowed into the address and
   * the link 404s. This is a real way to ship a broken login email.
   */
  const text = `Here is your link to sign in to eCommHarvest.

${link}

It works once and expires in ${expiry}.

If you didn't ask for this, you can ignore this email — nobody can sign in without the link above.

eCommHarvest · a trading name of Love Your Marketing LLC`

  return { subject: 'Your eCommHarvest login link', html, text }
}
