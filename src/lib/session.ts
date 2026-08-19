import { getFieldsToSign, jwtSign } from 'payload'
import { generateExpiredPayloadCookie, generatePayloadCookie, addSessionToUser } from 'payload/shared'

import type { User } from '@/payload-types'
import { payload } from '@/lib/entitlements'

/**
 * Mints and clears Payload auth cookies.
 *
 * Needed because `payload.login()` requires a password, and passwordless
 * sign-in has already proven identity by the time we get here. This does what
 * login does after the password check: registers a session on the user, signs a
 * JWT for it, and formats the cookie exactly as Payload's own auth expects — so
 * `payload.auth()` and the admin panel both recognise the result.
 */

const collectionSlug = 'users'

export const createSessionCookie = async (user: User): Promise<string> => {
  const p = await payload()
  const collectionConfig = p.collections[collectionSlug].config

  // Payload 3 tracks sessions per login, so a token without one is not valid.
  const { sid } = await addSessionToUser({
    collectionConfig,
    payload: p,
    // A minimal request stub is all addSessionToUser needs here.
    req: { payload: p } as never,
    user: user as never,
  })

  const fieldsToSign = getFieldsToSign({
    collectionConfig,
    email: user.email,
    sid,
    user: user as never,
  })

  const { token } = await jwtSign({
    fieldsToSign,
    secret: p.secret,
    tokenExpiration: collectionConfig.auth.tokenExpiration,
  })

  return generatePayloadCookie({
    collectionAuthConfig: collectionConfig.auth,
    cookiePrefix: p.config.cookiePrefix,
    token,
  })
}

export const createLogoutCookie = async (): Promise<string> => {
  const p = await payload()
  return generateExpiredPayloadCookie({
    collectionAuthConfig: p.collections[collectionSlug].config.auth,
    cookiePrefix: p.config.cookiePrefix,
  })
}
