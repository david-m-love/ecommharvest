'use client'

import { useState } from 'react'

type State = 'idle' | 'sending' | 'sent' | 'error'

export const LoginForm = ({ next }: { next?: string }) => {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setState('sending')
    setMessage('')
    try {
      const res = await fetch('/api/auth/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, next }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string }
      if (res.ok && data.ok) {
        setState('sent')
        setMessage(data.message || 'Check your inbox.')
        return
      }
      setState('error')
      setMessage(data.error || 'Something went wrong. Please try again.')
    } catch {
      setState('error')
      setMessage('We could not reach the server. Check your connection and try again.')
    }
  }

  if (state === 'sent') {
    return (
      <>
        <p className="flash flash-ok">{message}</p>
        <p className="authnote">
          The link works once and expires in 15 minutes. Wrong address?{' '}
          <button type="button" className="signout" onClick={() => setState('idle')}>
            Try another
          </button>
        </p>
      </>
    )
  }

  return (
    <form onSubmit={submit} noValidate>
      {state === 'error' && <p className="flash flash-error">{message}</p>}
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" className="btn btn-lg" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
      </button>
    </form>
  )
}
