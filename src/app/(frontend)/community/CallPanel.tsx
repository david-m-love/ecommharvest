import Link from 'next/link'

import { threadPath } from '@/lib/community'
import { JOIN_CALL_DEFAULT_LABEL, joinLive } from '@/lib/join-live'
import type { SiteStyles } from '@/lib/site-styles'

/**
 * The weekly call, at the top of the room.
 *
 * Decided by `joinLive()` — the same rule the masterclass link uses, and the
 * reason it is a shared function: **both** a switch and a link are required. A
 * switch flipped on before the URL is pasted would put a dead "join the call"
 * link at the top of the community at exactly the moment somebody is trying to
 * use it, and whoever clicks a dead link stops looking.
 *
 * The details are free text rather than a schedule. A recurring call that moves
 * one week is a sentence somebody types, not a deploy.
 */
export const CallPanel = ({ styles }: { styles: SiteStyles }) => {
  const live = joinLive(
    {
      showJoinLive: styles.showWeeklyCall,
      liveJoinUrl: styles.weeklyCallUrl,
      joinLiveLabel: styles.weeklyCallLabel,
    },
    JOIN_CALL_DEFAULT_LABEL,
  )
  if (!live) return null

  return (
    <aside className="callcard">
      <div className="callcard-body">
        <h2>The weekly call</h2>
        <p>{styles.weeklyCallWhen || 'Details in the pinned thread.'}</p>
      </div>
      <div className="callcard-actions">
        {styles.weeklyCallThread && (
          <Link href={threadPath(styles.weeklyCallThread)} className="minibtn">
            Questions for this week
          </Link>
        )}
        {/* rel on an external meeting link: nothing here should hand the
            opener a window reference back into the member area. */}
        <a
          className="btn"
          href={live.joinUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {live.joinLabel}
        </a>
      </div>
    </aside>
  )
}
