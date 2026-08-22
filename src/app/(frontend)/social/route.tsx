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
 *   /social?title=...&kicker=...
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
              fontSize: 26,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: gold,
              fontWeight: 700,
              marginBottom: 26,
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              fontSize: title.length > 60 ? 62 : 76,
              lineHeight: 1.06,
              letterSpacing: -2,
              color: cream,
              fontWeight: 800,
            }}
          >
            {title}
          </div>
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
