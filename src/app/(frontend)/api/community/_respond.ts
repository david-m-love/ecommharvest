import { NextResponse } from 'next/server'

/**
 * The community routes answer both a form post and a `fetch`, and this decides
 * which.
 *
 * Every page in the room works with JavaScript switched off — the composer and
 * the reply box are plain forms, as the members screen already is. That is not
 * nostalgia: a form post is the version that still works on a phone with a
 * flaky connection, and it means a failed post lands on a page with the error
 * on it rather than in a console nobody opens.
 */

export type Body = Record<string, string>

/** Reads a JSON body or a form body, without the caller caring which arrived. */
export const readBody = async (request: Request): Promise<{ body: Body; wantsJson: boolean }> => {
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const parsed = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const body: Body = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== null && value !== undefined) body[key] = String(value)
    }
    return { body, wantsJson: true }
  }
  const form = await request.formData().catch(() => null)
  const body: Body = {}
  if (form) {
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') body[key] = value
    }
  }
  return { body, wantsJson: false }
}

const origin = (request: Request) => new URL(request.url).origin

/** Success: JSON callers get JSON, form callers get sent to the page. */
export const done = (request: Request, wantsJson: boolean, path: string, extra: object = {}) =>
  wantsJson
    ? NextResponse.json({ ok: true, path, ...extra }, { headers: { 'Cache-Control': 'no-store' } })
    : NextResponse.redirect(new URL(path, origin(request)), 303)

/**
 * Failure, carried back to the page in the query string.
 *
 * `?error=` rather than a flash cookie: it survives the redirect, it needs no
 * session state, and a shared link carrying a stale error is a smaller problem
 * than a form that swallows the reason it refused.
 */
export const failed = (
  request: Request,
  wantsJson: boolean,
  path: string,
  error: string,
  status = 400,
) => {
  if (wantsJson) return NextResponse.json({ ok: false, error }, { status })
  const url = new URL(path, origin(request))
  url.searchParams.set('error', error)
  return NextResponse.redirect(url, 303)
}
