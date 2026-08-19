import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { LoginForm } from './LoginForm'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

const ERRORS: Record<string, string> = {
  expired: 'That sign-in link has expired or was already used. Here is a fresh one.',
  unknown: 'We could not find that account. Try entering your email again.',
}

export default async function LoginPage({
  searchParams,
}: {
  // Next 16: searchParams is a promise.
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { error, next } = await searchParams

  // Already signed in? Skip the form.
  const user = await getCurrentUser()
  if (user) redirect(next && next.startsWith('/') ? next : '/learn')

  return (
    <main className="authwrap">
      <div className="authcard">
        {error && ERRORS[error] && <p className="flash flash-error">{ERRORS[error]}</p>}
        <h1>Sign in</h1>
        <p className="sub">
          No password needed. Enter your email and we&rsquo;ll send you a link that signs you
          straight in.
        </p>
        <LoginForm next={next} />
      </div>
    </main>
  )
}
