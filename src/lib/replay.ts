/**
 * Turning a pasted YouTube link into something safe to put in an iframe.
 *
 * Its own file with no imports, like `safe-next.ts`, because it is a security
 * boundary: whatever is typed into the admin's "Replay link" field ends up as an
 * iframe `src` on a page only members see, so this accepts a short list of exact
 * shapes and nothing else. Anything else returns null and no frame is drawn.
 *
 * YouTube only, on purpose. An unlisted video is the free way to host a call
 * recording, and "any URL" would make this field a way to put arbitrary pages
 * inside the members' area.
 *
 * Embeds use the `youtube-nocookie.com` host, which does not set tracking
 * cookies until somebody presses play, and `rel=0` so the end of the replay
 * suggests this channel's videos rather than strangers'.
 */

const ID = /^[A-Za-z0-9_-]{11}$/

const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'])

/** The 11-character video id in a YouTube link, or null. */
export const youtubeId = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null
  const text = raw.trim()
  if (!text || text.length > 300) return null

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  // No credentials in the address: `https://youtube.com@evil.example/` parses
  // with a username and a different host, and must never be treated as YouTube.
  if (url.username || url.password) return null

  const host = url.hostname.toLowerCase()
  let id: string | undefined

  if (host === 'youtu.be') {
    id = url.pathname.split('/')[1]
  } else if (HOSTS.has(host)) {
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts[0] === 'watch') id = url.searchParams.get('v') ?? undefined
    else if (['embed', 'live', 'shorts', 'v'].includes(parts[0])) id = parts[1]
  }
  return id && ID.test(id) ? id : null
}

/** Start time in seconds from `?t=90`, `?t=1m30s` or `?start=90`, if there is one. */
const startSeconds = (raw: string): number => {
  try {
    const url = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`)
    const value = url.searchParams.get('t') ?? url.searchParams.get('start')
    if (!value) return 0
    if (/^\d+$/.test(value)) return Math.min(Number(value), 86_400)
    const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value)
    if (!m) return 0
    return Math.min(Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0), 86_400)
  } catch {
    return 0
  }
}

/** The iframe address for a pasted link, or null when it is not a YouTube video. */
export const replayEmbedUrl = (raw: unknown): string | null => {
  const id = youtubeId(raw)
  if (!id) return null
  const start = startSeconds(String(raw))
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0${start ? `&start=${start}` : ''}`
}
