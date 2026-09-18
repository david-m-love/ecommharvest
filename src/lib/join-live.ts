/**
 * Whether the "join the live masterclass" link goes on the page, and what it
 * says.
 *
 * Its own file, with no imports, for one practical reason: `site-styles.ts`
 * pulls in the Payload config, which refuses to load without a database. This
 * rule decides whether registrants can find the room on the one morning it
 * matters, so it has to be testable without standing a database up first.
 *
 * It used to be decided by the clock — two instants deciding when the link
 * appeared and vanished. That was correct and it was the wrong design: it could
 * only ever be right about a date typed into a source file weeks earlier, so the
 * morning the start slipped by an hour the fix was a deploy, and the person who
 * actually knows whether the room is open — the one presenting — had no way to
 * say so. A switch in the admin is right about whatever is really happening.
 */

/** The wording when nobody has typed any. */
export const JOIN_LIVE_DEFAULT_LABEL = 'Already registered? Join the live masterclass →'

export type JoinLiveSettings = {
  showJoinLive: boolean
  liveJoinUrl: string | null
  joinLiveLabel: string | null
}

/**
 * **Both** the switch and a link are required.
 *
 * A switch turned on before the URL is pasted would render a dead "join the live
 * masterclass" at exactly the moment somebody is trying to use it — and whoever
 * clicks a dead link stops looking. Off is recoverable; broken is not.
 */
export const joinLive = (
  settings: JoinLiveSettings,
): { joinUrl: string; joinLabel: string } | null =>
  settings.showJoinLive && settings.liveJoinUrl
    ? {
        joinUrl: settings.liveJoinUrl,
        joinLabel: settings.joinLiveLabel || JOIN_LIVE_DEFAULT_LABEL,
      }
    : null
