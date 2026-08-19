/**
 * Masterclass registration, deliberately independent of Next's request objects
 * so it can be tested directly rather than through a mocked req/res pair.
 *
 * Writes to every sink that is configured and refuses the request when none
 * are, so a lead is never accepted into a void:
 *
 *   Registrations collection      always, once a database is present
 *   KV_REST_API_URL/_TOKEN        Upstash/Vercel KV, plus per-IP rate limiting
 *   KLAVIYO_PRIVATE_KEY/_LIST_ID  Klaviyo list subscribe
 *   REGISTRATION_WEBHOOK_URL      generic JSON POST (Zapier, Make, n8n)
 */

const KLAVIYO_REVISION = '2024-10-15'
const RATE_LIMIT = 8 // submissions per IP per hour
const MIN_FILL_MS = 2500 // faster than a human could read the form
export const DEFAULT_EVENT = 'q4-masterclass-2026-09-03'

export type RegistrationInput = {
  name?: unknown
  email?: unknown
  storeUrl?: unknown
  consent?: unknown
  /** Honeypot: hidden from people, filled by bots. */
  company?: unknown
  /** When the form was rendered, for the minimum-fill-time check. */
  t?: unknown
  event?: unknown
}

export type RequestMeta = {
  ip: string
  userAgent?: string
  referer?: string
}

export type RegistrationResult = {
  status: number
  body: { ok: boolean; error?: string; errors?: Record<string, string> }
}

const env = (key: string) => process.env[key] || ''
const hasKv = () => Boolean(env('KV_REST_API_URL') && env('KV_REST_API_TOKEN'))
const hasKlaviyo = () => Boolean(env('KLAVIYO_PRIVATE_KEY') && env('KLAVIYO_LIST_ID'))
const hasWebhook = () => Boolean(env('REGISTRATION_WEBHOOK_URL'))

/** The database is always a sink when Payload can reach it. */
const hasDatabase = () => Boolean(env('DATABASE_URI'))

const clean = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

/**
 * Deliberately permissive: rejecting unusual-but-valid addresses costs real
 * leads, and the confirmation email is the real validation.
 */
export const validEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254

async function kv(command: unknown[]) {
  const res = await fetch(env('KV_REST_API_URL'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('KV_REST_API_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })
  if (!res.ok) throw new Error(`kv ${String(command[0])} failed: ${res.status}`)
  return (await res.json()).result
}

async function klaviyoSubscribe(reg: StoredRegistration) {
  const res = await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs', {
    method: 'POST',
    headers: {
      Authorization: `Klaviyo-API-Key ${env('KLAVIYO_PRIVATE_KEY')}`,
      revision: KLAVIYO_REVISION,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'profile-subscription-bulk-create-job',
        attributes: {
          profiles: {
            data: [
              {
                type: 'profile',
                attributes: {
                  email: reg.email,
                  first_name: reg.name,
                  properties: {
                    store_url: reg.storeUrl || '',
                    source: 'q4-masterclass-landing',
                    registered_for: reg.event,
                  },
                  subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } },
                },
              },
            ],
          },
        },
        relationships: { list: { data: { type: 'list', id: env('KLAVIYO_LIST_ID') } } },
      },
    }),
  })
  // 202 Accepted is the success case for a bulk job.
  if (!res.ok && res.status !== 202) {
    throw new Error(`klaviyo failed: ${res.status} ${await res.text()}`)
  }
}

async function postWebhook(reg: StoredRegistration) {
  const res = await fetch(env('REGISTRATION_WEBHOOK_URL'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reg),
  })
  if (!res.ok) throw new Error(`webhook failed: ${res.status}`)
}

async function storeInDatabase(reg: StoredRegistration) {
  // Imported lazily so this module — and its tests — do not pull in the whole
  // CMS config just to have a database sink available. Also keeps the CMS off
  // the cold-start path for requests that never reach this sink.
  const { payload } = await import('@/lib/entitlements')
  const p = await payload()
  await p.create({
    collection: 'registrations',
    data: {
      email: reg.email,
      name: reg.name,
      storeUrl: reg.storeUrl,
      event: reg.event,
      consent: reg.consent,
      ip: reg.ip,
      userAgent: reg.userAgent,
      referer: reg.referer,
    },
    overrideAccess: true, // the collection refuses creates from everyone else
  })
}

export type StoredRegistration = {
  name: string
  email: string
  storeUrl: string
  event: string
  consent: boolean
  registeredAt: string
  ip: string
  userAgent: string
  referer: string
}

export async function processRegistration(
  input: RegistrationInput,
  meta: RequestMeta,
): Promise<RegistrationResult> {
  const sinks = [hasDatabase(), hasKv(), hasKlaviyo(), hasWebhook()]

  // Fail loudly rather than accepting registrations nothing will ever read.
  if (!sinks.some(Boolean)) {
    console.error('register: no sink configured')
    return {
      status: 503,
      body: {
        ok: false,
        error: 'Registration is not configured yet. Please email us and we will save you a seat.',
      },
    }
  }

  const name = clean(input.name, 100)
  const email = clean(input.email, 254).toLowerCase()
  const storeUrl = clean(input.storeUrl, 200)
  const event = clean(input.event, 100) || DEFAULT_EVENT
  const consent = input.consent === true || input.consent === 'true' || input.consent === 'on'
  const honeypot = clean(input.company, 100)
  const renderedAt = Number(input.t) || 0

  // Bots fill hidden fields and submit instantly. Both get a normal-looking
  // success so there is no signal to tune against.
  if (honeypot) return { status: 200, body: { ok: true } }
  if (renderedAt && Date.now() - renderedAt < MIN_FILL_MS) {
    return { status: 200, body: { ok: true } }
  }

  const errors: Record<string, string> = {}
  if (name.length < 2) errors.name = 'Please enter your first name.'
  if (!validEmail(email)) errors.email = 'Please enter a valid email address.'
  if (!consent) errors.consent = 'Please agree to receive the invite and reminders.'
  if (Object.keys(errors).length) {
    return {
      status: 422,
      body: { ok: false, error: 'Please check the highlighted fields.', errors },
    }
  }

  if (hasKv()) {
    try {
      const key = `ratelimit:${meta.ip}`
      const hits = await kv(['INCR', key])
      if (hits === 1) await kv(['EXPIRE', key, '3600'])
      if (hits > RATE_LIMIT) {
        return {
          status: 429,
          body: { ok: false, error: 'Too many attempts. Please try again later.' },
        }
      }
    } catch (err) {
      // A broken rate limiter must not block real registrations.
      console.error('register: rate limit check failed, allowing request', err)
    }
  }

  const registration: StoredRegistration = {
    name,
    email,
    storeUrl,
    event,
    consent,
    registeredAt: new Date().toISOString(),
    ip: meta.ip,
    userAgent: clean(meta.userAgent, 300),
    referer: clean(meta.referer, 300),
  }

  // Every sink is attempted; one failing must not lose the others.
  const attempts: { name: string; run: Promise<unknown> }[] = []
  if (hasDatabase()) attempts.push({ name: 'database', run: storeInDatabase(registration) })
  if (hasKv())
    attempts.push({
      name: 'kv',
      run: (async () => {
        await kv(['LPUSH', 'registrations', JSON.stringify(registration)])
        await kv(['SADD', 'registration_emails', registration.email])
      })(),
    })
  if (hasKlaviyo()) attempts.push({ name: 'klaviyo', run: klaviyoSubscribe(registration) })
  if (hasWebhook()) attempts.push({ name: 'webhook', run: postWebhook(registration) })

  const results = await Promise.allSettled(attempts.map((a) => a.run))
  const failed = results
    .map((r, i) => ({ r, name: attempts[i].name }))
    .filter(({ r }) => r.status === 'rejected')
  failed.forEach(({ r, name: sink }) =>
    console.error(`register: sink ${sink} failed`, (r as PromiseRejectedResult).reason),
  )

  if (failed.length === attempts.length) {
    return {
      status: 502,
      body: {
        ok: false,
        error: 'We could not save your registration. Please try again in a moment.',
      },
    }
  }

  return { status: 200, body: { ok: true } }
}
