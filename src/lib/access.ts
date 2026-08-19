import type { Access, FieldAccess } from 'payload'

import type { User } from '@/payload-types'

/**
 * Access control primitives. Every rule in the app routes through here so the
 * policy lives in one auditable place rather than scattered across collections.
 *
 * Payload semantics worth remembering: returning `true` allows everything,
 * `false` allows nothing, and returning a *query constraint* allows only the
 * documents matching it. The constraint form is what enforces entitlements
 * without us hand-filtering in every route.
 */

export const isAdmin = (user: unknown): boolean => {
  const roles = (user as User | null)?.roles
  return Array.isArray(roles) && roles.includes('admin')
}

/** Admin-only. The default for anything that manages content or people. */
export const adminOnly: Access = ({ req }) => isAdmin(req.user)

/** Any authenticated user. */
export const loggedIn: Access = ({ req }) => Boolean(req.user)

/** Admins, or the user acting on their own document. */
export const adminOrSelf: Access = ({ req }) => {
  if (isAdmin(req.user)) return true
  if (!req.user) return false
  return { id: { equals: req.user.id } }
}

/** Field-level: only admins may write this field (e.g. `roles`). */
export const adminOnlyField: FieldAccess = ({ req }) => isAdmin(req.user)

/**
 * Published content is world-readable; drafts are admin-only.
 *
 * Gating *enrolment* is separate from gating *reads* on purpose: a course and
 * its lesson titles are the sales page, so they stay public. Only the video
 * playback token is entitlement-checked, in `lib/entitlements.ts`.
 */
export const publishedOrAdmin: Access = ({ req }) => {
  if (isAdmin(req.user)) return true
  return { _status: { equals: 'published' } }
}
