import type { Access, FieldAccess } from 'payload'

import type { Role, User } from '@/payload-types'

/**
 * What a person is allowed to do, as a closed list.
 *
 * Two ideas kept separate on purpose:
 *
 *   - `roles` on a User is *identity*: admin, or member. It is coarse and it
 *     rarely changes.
 *   - a **capability** is *permission*: one specific thing a person may do. A
 *     Role document is a named bundle of capabilities, so "Copywriter" can be
 *     defined once and handed to three people.
 *
 * Why not just add more values to the `roles` select: every new job title would
 * mean a schema change and a redeploy. Capabilities let a new job title be a row
 * in the database, created from the admin panel, with no code involved. That is
 * the difference between David adding a teammate himself and filing a ticket.
 *
 * Adding a capability here is deliberately a code change, because something has
 * to enforce it. Composing them is not.
 */
export const CAPABILITIES = {
  'pages:read': 'View pages in the builder',
  'pages:write': 'Create and edit pages',
  'pages:publish': 'Publish and unpublish pages',
  /**
   * Writing posts is a separate permission from building pages on purpose. A
   * freelance writer should be able to draft and publish the blog without also
   * being able to edit the page that takes registrations.
   */
  'posts:write': 'Write and edit blog posts',
  'posts:publish': 'Publish and unpublish blog posts',
  'users:manage': 'Invite people, edit them, and assign roles',
  'registrations:read': 'View and export masterclass registrants',
  'courses:manage': 'Create and edit courses, modules and lessons',
  'media:manage': 'Upload and manage media',
} as const

export type Capability = keyof typeof CAPABILITIES

export const CAPABILITY_LIST = Object.keys(CAPABILITIES) as Capability[]

export const CAPABILITY_OPTIONS = CAPABILITY_LIST.map((value) => ({
  label: CAPABILITIES[value],
  value,
}))

/**
 * Capabilities that are dangerous to hand out, flagged so the admin UI can say
 * so. `users:manage` is privilege escalation in one step: anyone holding it can
 * make themselves an admin.
 */
export const SENSITIVE_CAPABILITIES: Capability[] = ['users:manage']

const isAdminUser = (user: unknown): boolean => {
  const roles = (user as User | null)?.roles
  return Array.isArray(roles) && roles.includes('admin')
}

/**
 * Every capability a user holds.
 *
 * Admin is not a bundle of capabilities that happens to contain all of them —
 * it short-circuits. That matters: adding a new capability to the list above
 * must never silently lock the admin out of a new feature, which is exactly
 * what would happen if admin were stored data rather than a rule.
 *
 * Roles arrive either as ids or as populated documents depending on the depth of
 * the query that loaded the user, so both shapes are handled.
 */
export const capabilitiesOf = (user: unknown): Set<Capability> => {
  if (isAdminUser(user)) return new Set(CAPABILITY_LIST)

  const found = new Set<Capability>()
  const roles = (user as (User & { roleRefs?: unknown }) | null)?.roleRefs
  if (!Array.isArray(roles)) return found

  for (const role of roles) {
    // An unpopulated relationship is just an id, which carries no capabilities.
    // Failing closed here is the point: never guess a permission.
    if (typeof role !== 'object' || role === null) continue
    const caps = (role as Role).capabilities
    if (!Array.isArray(caps)) continue
    for (const cap of caps) {
      if ((CAPABILITY_LIST as string[]).includes(cap)) found.add(cap as Capability)
    }
  }
  return found
}

export const can = (user: unknown, capability: Capability): boolean =>
  isAdminUser(user) || capabilitiesOf(user).has(capability)

/** Payload collection access: requires one capability. */
export const requireCapability =
  (capability: Capability): Access =>
  ({ req }) =>
    can(req.user, capability)

/** Payload field access: requires one capability. */
export const requireCapabilityField =
  (capability: Capability): FieldAccess =>
  ({ req }) =>
    can(req.user, capability)

/** Payload collection access: requires any one of several capabilities. */
export const requireAnyCapability =
  (...capabilities: Capability[]): Access =>
  ({ req }) =>
    capabilities.some((capability) => can(req.user, capability))
