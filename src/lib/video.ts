/**
 * Video provider adapter.
 *
 * Everything in the app talks to `getVideoProvider()` and never to Cloudflare
 * directly, so switching to Bunny Stream or Mux later means writing one more
 * implementation of this interface — not touching the admin, the player, or the
 * entitlement path.
 *
 * When credentials are absent the stub provider is returned. It refuses uploads
 * with a clear message rather than pretending to work, which keeps `npm run dev`
 * usable with no cloud account while making the missing config obvious.
 */

export type VideoStatus = 'none' | 'uploading' | 'processing' | 'ready' | 'error'

export type VideoDetails = {
  videoId: string
  status: VideoStatus
  durationSeconds?: number
  thumbnailUrl?: string
  /** Provider-side error text, when status is 'error'. */
  errorReason?: string
}

export type DirectUpload = {
  /** One-time URL the browser PUTs the file to, bypassing our server entirely. */
  uploadUrl: string
  videoId: string
}

export type VideoProvider = {
  readonly name: string
  readonly configured: boolean
  /** Mint a one-time upload URL. Large files never touch our serverless functions. */
  createDirectUpload(args: { name: string; maxDurationSeconds?: number }): Promise<DirectUpload>
  getVideo(videoId: string): Promise<VideoDetails>
  deleteVideo(videoId: string): Promise<void>
  /**
   * Short-lived token authorising playback of one video. Returned only after an
   * entitlement check, and deliberately short-lived so a copied URL stops
   * working rather than becoming a permanent share link.
   */
  createPlaybackToken(videoId: string, ttlSeconds: number): Promise<string>
  /** Player source for a video, given a playback token. */
  playbackUrl(videoId: string, token?: string): string
  thumbnailUrl(videoId: string, token?: string): string
}

class VideoProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VideoProviderError'
  }
}

// --- Cloudflare Stream ---------------------------------------------------

const CF_API = 'https://api.cloudflare.com/client/v4'

/** Cloudflare's encoding states mapped onto ours. */
const mapCloudflareState = (state?: string): VideoStatus => {
  switch (state) {
    case 'ready':
      return 'ready'
    case 'inprogress':
    case 'queued':
      return 'processing'
    case 'pendingupload':
      return 'uploading'
    case 'error':
      return 'error'
    default:
      return 'processing'
  }
}

const cloudflareProvider = (accountId: string, token: string): VideoProvider => {
  const request = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${CF_API}/accounts/${accountId}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    })
    const body = (await res.json().catch(() => ({}))) as {
      success?: boolean
      result?: unknown
      errors?: { message?: string }[]
    }
    if (!res.ok || body.success === false) {
      const detail = body.errors?.map((e) => e.message).join('; ') || `HTTP ${res.status}`
      throw new VideoProviderError(`Cloudflare Stream: ${detail}`)
    }
    return body.result
  }

  return {
    name: 'cloudflare-stream',
    configured: true,

    async createDirectUpload({ name, maxDurationSeconds = 60 * 60 * 4 }) {
      const result = (await request('/stream/direct_upload', {
        method: 'POST',
        body: JSON.stringify({
          maxDurationSeconds,
          // Signed URLs are the whole access-control mechanism, so this must be
          // set at creation time — it cannot be added to a video afterwards.
          requireSignedURLs: true,
          meta: { name },
        }),
      })) as { uploadURL: string; uid: string }
      return { uploadUrl: result.uploadURL, videoId: result.uid }
    },

    async getVideo(videoId) {
      const result = (await request(`/stream/${videoId}`)) as {
        status?: { state?: string; errorReasonText?: string }
        duration?: number
        thumbnail?: string
      }
      return {
        videoId,
        status: mapCloudflareState(result.status?.state),
        // Cloudflare reports -1 until encoding finishes.
        durationSeconds:
          typeof result.duration === 'number' && result.duration > 0
            ? Math.round(result.duration)
            : undefined,
        thumbnailUrl: result.thumbnail,
        errorReason: result.status?.errorReasonText,
      }
    },

    async deleteVideo(videoId) {
      await request(`/stream/${videoId}`, { method: 'DELETE' })
    },

    async createPlaybackToken(videoId, ttlSeconds) {
      const keyId = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID
      const jwk = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_JWK

      // With a signing key we sign locally — no API round trip on every play.
      if (keyId && jwk) {
        return signStreamTokenLocally({ videoId, ttlSeconds, keyId, jwk })
      }

      // Fall back to Cloudflare minting it for us.
      const result = (await request(`/stream/${videoId}/token`, {
        method: 'POST',
        body: JSON.stringify({ exp: Math.floor(Date.now() / 1000) + ttlSeconds }),
      })) as { token: string }
      return result.token
    },

    playbackUrl(videoId, tokenValue) {
      // With signed URLs the token replaces the video id in the path.
      return `https://customer-${accountId}.cloudflarestream.com/${tokenValue || videoId}/iframe`
    },

    thumbnailUrl(videoId, tokenValue) {
      return `https://customer-${accountId}.cloudflarestream.com/${tokenValue || videoId}/thumbnails/thumbnail.jpg`
    },
  }
}

/**
 * Signs a Cloudflare Stream playback JWT with the account's RSA signing key.
 * Uses WebCrypto so it works in any runtime without a JWT dependency.
 */
const signStreamTokenLocally = async ({
  videoId,
  ttlSeconds,
  keyId,
  jwk,
}: {
  videoId: string
  ttlSeconds: number
  keyId: string
  jwk: string
}): Promise<string> => {
  const b64url = (input: ArrayBuffer | string) => {
    const bytes =
      typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
    let binary = ''
    bytes.forEach((b) => (binary += String.fromCharCode(b)))
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  // Cloudflare hands the JWK over base64-encoded.
  const decodedJwk = JSON.parse(
    jwk.trim().startsWith('{') ? jwk : Buffer.from(jwk, 'base64').toString('utf8'),
  )

  const header = { alg: 'RS256', kid: keyId }
  const payload = {
    sub: videoId,
    kid: keyId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    nbf: Math.floor(Date.now() / 1000) - 30, // small skew allowance
  }

  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const key = await crypto.subtle.importKey(
    'jwk',
    decodedJwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(data),
  )
  return `${data}.${b64url(signature)}`
}

// --- Stub ---------------------------------------------------------------

const MISSING =
  'Video hosting is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_TOKEN.'

const stubProvider: VideoProvider = {
  name: 'stub',
  configured: false,
  async createDirectUpload() {
    throw new VideoProviderError(MISSING)
  },
  async getVideo(videoId) {
    return { videoId, status: 'none' }
  },
  async deleteVideo() {
    // Nothing was ever stored, so deleting is a no-op rather than an error.
  },
  async createPlaybackToken() {
    throw new VideoProviderError(MISSING)
  },
  playbackUrl() {
    return ''
  },
  thumbnailUrl() {
    return ''
  },
}

let cached: VideoProvider | null = null

export const getVideoProvider = (): VideoProvider => {
  if (cached) return cached
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const token = process.env.CLOUDFLARE_STREAM_TOKEN
  cached = accountId && token ? cloudflareProvider(accountId, token) : stubProvider
  return cached
}

/** Test seam: clears the memoised provider so env changes take effect. */
export const resetVideoProvider = () => {
  cached = null
}

export { VideoProviderError }
