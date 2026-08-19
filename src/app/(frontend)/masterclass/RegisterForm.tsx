'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Masterclass registration form.
 *
 * Validates client-side with the same rules the server enforces, so obvious
 * mistakes never cost a round trip, then defers to the server's per-field
 * errors. Carries a render timestamp and a honeypot for the bot checks.
 */

type FieldErrors = Record<string, string>

export const RegisterForm = () => {
  const router = useRouter()
  const renderedAt = useRef(Date.now())
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setErrors({})

    const form = new FormData(event.currentTarget)
    const payload = {
      name: String(form.get('name') || '').trim(),
      email: String(form.get('email') || '').trim(),
      storeUrl: String(form.get('storeUrl') || '').trim(),
      consent: form.get('consent') === 'on',
      company: String(form.get('company') || ''),
      t: renderedAt.current,
    }

    const local: FieldErrors = {}
    if (payload.name.length < 2) local.name = 'Please enter your first name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email)) {
      local.email = 'Please enter a valid email address.'
    }
    if (!payload.consent) local.consent = 'Please agree to receive the invite and reminders.'
    if (Object.keys(local).length) {
      setErrors(local)
      setFormError('Please check the highlighted fields.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        errors?: FieldErrors
      }
      if (res.ok && data.ok) {
        router.push('/masterclass/thanks')
        return
      }
      setErrors(data.errors || {})
      setFormError(data.error || 'Something went wrong. Please try again.')
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="formcard" onSubmit={submit} noValidate>
      {formError && (
        <div className="formerr" role="alert">
          {formError}
        </div>
      )}

      <div className="field">
        <label htmlFor="f-name">First name</label>
        <input
          type="text"
          id="f-name"
          name="name"
          autoComplete="given-name"
          aria-invalid={errors.name ? 'true' : undefined}
          required
        />
        {errors.name && <span className="err">{errors.name}</span>}
      </div>

      <div className="field">
        <label htmlFor="f-email">Email</label>
        <input
          type="email"
          id="f-email"
          name="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={errors.email ? 'true' : undefined}
          required
        />
        {errors.email && <span className="err">{errors.email}</span>}
      </div>

      <div className="field">
        <label htmlFor="f-store">
          Store URL <span className="opt">(optional)</span>
        </label>
        <input type="url" id="f-store" name="storeUrl" autoComplete="url" placeholder="yourstore.com" />
      </div>

      {/* Honeypot: hidden from people, filled by bots. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="f-company">Company</label>
        <input type="text" id="f-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="consent">
        <input
          type="checkbox"
          id="f-consent"
          name="consent"
          aria-invalid={errors.consent ? 'true' : undefined}
          required
        />
        <label htmlFor="f-consent">
          Send me the invite, the replay, and Q4 emails from eCommHarvest. Unsubscribe anytime. See
          our <a href="/privacy">Privacy Policy</a>.
        </label>
      </div>
      {errors.consent && <span className="err">{errors.consent}</span>}

      <button type="submit" className="btn btn-lg" disabled={submitting}>
        {submitting ? 'Saving your seat…' : 'Save my seat'}
      </button>
      <p className="formnote">Free &middot; no card required &middot; replay sent to every registrant</p>
    </form>
  )
}
