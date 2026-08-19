'use client'

import { useCallback, useEffect, useState } from 'react'

import type { VideoStatus } from '@/lib/video'

/**
 * Fetches a signed playback URL on mount rather than embedding one in the HTML.
 *
 * Two reasons: the token is short-lived so it should not be baked into a cached
 * page, and the entitlement check runs server-side at fetch time — so revoking
 * access takes effect on the next load rather than whenever a page happens to
 * be regenerated.
 */

type Props = {
  lessonSlug: string
  playable: boolean
  videoStatus: VideoStatus
  initiallyComplete: boolean
  title: string
}

type LoadState = 'loading' | 'ready' | 'unavailable'

export const LessonPlayer = ({
  lessonSlug,
  playable,
  videoStatus,
  initiallyComplete,
  title,
}: Props) => {
  const [state, setState] = useState<LoadState>(playable ? 'loading' : 'unavailable')
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [reason, setReason] = useState<string>('')
  const [complete, setComplete] = useState(initiallyComplete)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!playable) {
      setReason('You need access to this course to watch this lesson.')
      return
    }
    if (videoStatus !== 'ready') {
      setState('unavailable')
      setReason(
        videoStatus === 'processing' || videoStatus === 'uploading'
          ? 'This video is still processing. Check back in a few minutes.'
          : 'This lesson doesn’t have a video yet.',
      )
      return
    }

    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/playback/${encodeURIComponent(lessonSlug)}`, {
          cache: 'no-store',
        })
        const data = (await res.json().catch(() => ({}))) as {
          playbackUrl?: string
          error?: string
        }
        if (cancelled) return
        if (res.ok && data.playbackUrl) {
          setPlaybackUrl(data.playbackUrl)
          setState('ready')
        } else {
          setState('unavailable')
          setReason(data.error || 'This video could not be loaded.')
        }
      } catch {
        if (!cancelled) {
          setState('unavailable')
          setReason('We could not reach the video service.')
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [lessonSlug, playable, videoStatus])

  const toggleComplete = useCallback(async () => {
    setSaving(true)
    const nextValue = !complete
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonSlug, completed: nextValue }),
      })
      if (res.ok) setComplete(nextValue)
    } finally {
      setSaving(false)
    }
  }, [complete, lessonSlug])

  return (
    <>
      <div className="player">
        {state === 'ready' && playbackUrl ? (
          <iframe
            src={playbackUrl}
            title={title}
            allow="accelerometer; gyroscope; encrypted-media; picture-in-picture;"
            allowFullScreen
          />
        ) : (
          <div className="player-msg">
            {state === 'loading' ? (
              <strong>Loading…</strong>
            ) : (
              <>
                <strong>{playable ? 'Video unavailable' : 'Locked'}</strong>
                <p>{reason}</p>
              </>
            )}
          </div>
        )}
      </div>

      {playable && (
        <div className="cta-row cta-row-2 completerow">
          <button
            type="button"
            className={complete ? 'btn btn-ghost' : 'btn'}
            onClick={toggleComplete}
            disabled={saving}
          >
            {complete ? '✓ Completed' : 'Mark as complete'}
          </button>
        </div>
      )}
    </>
  )
}
