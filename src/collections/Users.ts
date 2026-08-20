import type { CollectionConfig } from 'payload'

import { adminOnly, adminOnlyField, adminOrSelf, isAdmin } from '@/lib/access'
import { auditUserRoleChange } from '@/lib/audit'
import { can, requireCapabilityField } from '@/lib/capabilities'
import { ensureFirstUserIsAdmin } from '@/lib/first-user'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // Members sign in by emailed link; admins use a password. Both live here so
    // one identity works across /learn and /admin.
    tokenExpiration: 60 * 60 * 24 * 30,
    maxLoginAttempts: 10,
    lockTime: 10 * 60 * 1000,
    /**
     * Populate `roleRefs` one level deep when binding the user to the request.
     *
     * Required, not an optimisation: `capabilitiesOf()` reads capabilities off
     * the populated role documents, and at the default depth of 0 it would see
     * bare ids, find no capabilities, and deny everything. Failing closed is
     * correct but it would look like the permission system was broken.
     *
     * Payload's JWT strategy re-reads the user with `findByID` on every request
     * (auth/strategies/jwt.js), so this is a fresh read rather than something
     * baked into the token. Consequence worth knowing: editing or removing a
     * role takes effect on the person's very next request — they do not need to
     * sign out. One small join per request buys that.
     */
    depth: 1,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'roles', 'roleRefs', 'createdAt'],
    group: 'People',
    // Members authenticate against this collection but never see it. Anyone
    // holding `users:manage` does.
    hidden: ({ user }) => !isAdmin(user) && !can(user, 'users:manage'),
  },
  access: {
    read: ({ req }) => {
      if (isAdmin(req.user) || can(req.user, 'users:manage')) return true
      if (!req.user) return false
      return { id: { equals: req.user.id } }
    },
    create: ({ req }) => isAdmin(req.user) || can(req.user, 'users:manage'),
    update: ({ req }) => {
      if (isAdmin(req.user) || can(req.user, 'users:manage')) return true
      if (!req.user) return false
      return { id: { equals: req.user.id } }
    },
    // Deletion stays admin-only. It is the one action here with no undo, and
    // `users:manage` is meant for onboarding a teammate, not removing one.
    delete: adminOnly,
    /**
     * Who may open the admin panel at all. Capability holders can, so a
     * teammate with only `pages:write` still gets in and sees only Pages.
     */
    admin: ({ req }) => {
      const user = req.user
      if (isAdmin(user)) return true
      // Any capability at all is enough to warrant a door; the collections
      // themselves decide what is behind it.
      return (
        can(user, 'pages:read') ||
        can(user, 'pages:write') ||
        can(user, 'users:manage') ||
        can(user, 'registrations:read') ||
        can(user, 'courses:manage') ||
        can(user, 'media:manage')
      )
    },
  },
  hooks: {
    // Order matters: this must run before the row is written, so the first
    // account cannot be created as a non-admin and lock everyone out.
    beforeChange: [ensureFirstUserIsAdmin],
    afterChange: [auditUserRoleChange],
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['member'],
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Member', value: 'member' },
      ],
      // Critical: without this a member could PATCH themselves to admin.
      access: { create: adminOnlyField, update: adminOnlyField },
      admin: {
        description:
          'Only admins can change this. The very first account is always created as an admin, whatever this says — otherwise nobody could sign in.',
      },
    },
    {
      name: 'roleRefs',
      label: 'Permissions',
      type: 'relationship',
      relationTo: 'roles',
      hasMany: true,
      /**
       * Writable by `users:manage`, unlike `roles` above, and that asymmetry is
       * the security boundary: a teammate who manages people can hand out any
       * custom role, but cannot mint a new admin — that still needs an admin.
       * Without the split, `users:manage` would be a one-step path to full
       * control. Covered by test/security.e2e.mjs.
       */
      access: {
        create: requireCapabilityField('users:manage'),
        update: requireCapabilityField('users:manage'),
      },
      admin: {
        description:
          'Roles granted to this person. Leave empty for no admin access. Admins ignore this and have everything.',
      },
    },
    {
      name: 'stripeCustomerId',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}
