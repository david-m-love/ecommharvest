import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

import { getSiteStyles } from '@/lib/site-styles'

/**
 * The picture that appears when a link to this site is shared.
 *
 * Without one, every link posted to Facebook, Instagram, iMessage, WhatsApp or
 * Slack renders as a bare grey card with a URL — including the links in a paid
 * ad and in every registrant's forward to a friend. It is the cheapest thing on
 * the site that affects click-through, and it was missing entirely.
 *
 * Drawn rather than designed as a file, so it always matches the page: the
 * heading comes from the page's own title, and the colours come from Site
 * Styles, so changing the brand gold changes the share cards too.
 *
 *   /social?title=...&kicker=...&when=...
 *
 * `when` is what makes an event card an event card. Without it this was a
 * handsome brand picture that gave the person seeing it in a group chat nothing
 * to act on — no date, no time, no reason to click today rather than never. The
 * masterclass routes pass it from `src/lib/event.ts`, so a moved date moves the
 * share card too.
 *
 * A route rather than Next's `opengraph-image` convention because the builder
 * pages have no file of their own to hang it on — their titles live in the
 * database — and one drawing shared by every page beats four that drift.
 */

export const runtime = 'nodejs'
// Cached at the edge for a day: the same title produces the same picture, and
// Facebook's scraper will ask for it repeatedly.
export const revalidate = 86400

const SIZE = { width: 1200, height: 630 }

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const title = (params.get('title') || 'eCommHarvest').slice(0, 120)
  const kicker = (params.get('kicker') || 'Q4 growth for e-commerce founders').slice(0, 80)
  /** Empty for a page with no date — the brand card is still the right picture. */
  const when = (params.get('when') || '').slice(0, 80)

  /**
   * Break a two-clause headline at its comma rather than wherever the text
   * happens to run out of room.
   *
   * "Your Q4 Profit Playbook, Built in 60 Minutes" wrapped to "…Playbook, Built"
   * / "in 60 Minutes", which splits a phrase in half and is the kind of thing
   * nobody notices in code and everybody notices in a group chat. Only when the
   * title would wrap anyway and only at the *last* comma, so a single-line title
   * is untouched and a list of three does not become a stack.
   */
  const comma = title.lastIndexOf(', ')
  const lines =
    title.length > 28 && comma > 8 && comma < title.length - 8
      ? [`${title.slice(0, comma + 1)}`, title.slice(comma + 2)]
      : [title]

  /**
   * Brand colours from Site Styles, with the design system's values as the
   * fallback. Fails soft: a share card in the wrong gold is a small problem, a
   * share card that 500s is a blank card again.
   */
  let gold = '#C99132'
  let navy = '#16324F'
  let cream = '#F2ECE0'
  try {
    const { css } = await getSiteStyles()
    const read = (name: string, fallback: string) =>
      css?.match(new RegExp(`${name}:(#[0-9a-fA-F]{6})`))?.[1] ?? fallback
    gold = read('--gold', gold)
    navy = read('--navy', navy)
    cream = read('--cream', cream)
  } catch {
    // Keep the defaults.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: `linear-gradient(150deg, #183551 0%, ${navy} 55%, #0E2135 100%)`,
          fontFamily: 'sans-serif',
        }}
      >
        {/* A gold rule along the top, the same device the page's final card uses. */}
        <div style={{ display: 'flex', height: 10, background: gold, borderRadius: 6 }} />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 24,
              letterSpacing: 3.5,
              textTransform: 'uppercase',
              color: gold,
              fontWeight: 700,
              marginBottom: 24,
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              /**
               * Three sizes, not two. Adding the date line costs about 100px of
               * height, so a long title that used to fit at 62 now has to come
               * down again — otherwise the headline and the date collide in the
               * one place nobody looks before posting a link.
               */
              fontSize: title.length > 72 ? 54 : title.length > 52 ? 64 : 76,
              lineHeight: 1.06,
              letterSpacing: -2,
              color: cream,
              fontWeight: 800,
            }}
          >
            {lines.map((line, i) => (
              <div key={i} style={{ display: 'flex' }}>
                {line}
              </div>
            ))}
          </div>
          {when ? (
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                marginTop: 30,
                padding: '14px 26px',
                borderRadius: 999,
                /**
                 * A chip rather than another line of text. On a phone a shared
                 * card is about 340px wide, where everything below the headline
                 * is roughly the same small grey — the pill is what makes the
                 * date read as a fact at a glance rather than as a subtitle.
                 */
                background: 'rgba(242, 236, 224, 0.10)',
                border: `2px solid ${gold}`,
                fontSize: 28,
                fontWeight: 700,
                color: cream,
                letterSpacing: -0.4,
              }}
            >
              {when}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: cream }}>eCommHarvest</div>
          <div style={{ fontSize: 24, color: '#A9BECF' }}>ecommharvest.com</div>
        </div>
      </div>
    ),
    SIZE,
  )
}
