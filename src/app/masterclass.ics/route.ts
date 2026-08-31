import {
  EVENT_END_UTC,
  EVENT_SEQUENCE,
  EVENT_START_UTC,
  EVENT_TITLE,
  EVENT_UID,
} from '@/lib/event'

/**
 * The "add to calendar" file, generated rather than kept as a static file.
 *
 * It used to live in `public/`, which meant the date existed in one more place
 * that had to be remembered — and this is the copy where being wrong is worst.
 * A wrong headline is embarrassing; a wrong calendar entry silently books
 * someone for the wrong hour and they find out by missing it.
 *
 * Two details that decide whether a *changed* time actually reaches people who
 * already downloaded it:
 *
 *  - **The UID does not change.** It identifies the entry already sitting in
 *    their calendar.
 *  - **SEQUENCE goes up.** Calendar apps use it to tell an update from a
 *    duplicate; without it, most ignore the second import entirely.
 *
 * Together they mean most people who added the old date get theirs corrected
 * rather than ending up with two entries. Not every client honours it, so a
 * reminder email is still worth sending.
 */
export const dynamic = 'force-static'

/** Folded at 75 octets, as iCalendar requires, with a space to continue. */
const fold = (line: string): string => {
  if (line.length <= 75) return line
  const parts = [line.slice(0, 75)]
  let rest = line.slice(75)
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`)
    rest = rest.slice(74)
  }
  if (rest) parts.push(` ${rest}`)
  return parts.join('\r\n')
}

const DESCRIPTION =
  'Free 90-minute masterclass with David Love and special guest Derek Crimin ' +
  '(B.O.M.Socks). Build your Q4 promotional calendar, offer strategy, email and ' +
  'SMS roadmap, and paid social plan in one sitting. The join link is in your ' +
  'confirmation email.'

export function GET() {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//eCommHarvest//Q4 Masterclass//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${EVENT_UID}`,
    `SEQUENCE:${EVENT_SEQUENCE}`,
    // A fixed stamp rather than "now": a file whose bytes change on every
    // request cannot be cached, and nothing here depends on when it was asked
    // for.
    'DTSTAMP:20260830T000000Z',
    `DTSTART:${EVENT_START_UTC}`,
    `DTEND:${EVENT_END_UTC}`,
    `SUMMARY:${EVENT_TITLE}`,
    fold(`DESCRIPTION:${DESCRIPTION}`),
    'LOCATION:Online',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Q4 Masterclass starts in 1 hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  // CRLF: the spec says so, and Outlook is the one that notices.
  return new Response(`${lines.join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="q4-masterclass.ics"',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  })
}
