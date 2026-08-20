import type { CollectionConfig } from 'payload'

import { isAdmin } from '@/lib/access'
import { CAPABILITY_OPTIONS, SENSITIVE_CAPABILITIES, can } from '@/lib/capabilities'

/**
 * A named bundle of capabilities — "Copywriter", "Bookkeeper", "Contractor".
 *
 * Roles exist so a new job title is data rather than a deploy. Create the role
 * once, tick what it may do, then assign it to as many people as you like.
 *
 * Only admins may create or edit roles, even for someone holding
 * `users:manage`. Editing a role rewrites the permissions of everyone already
 * assigned it, so it is a sharper tool than editing one person and is kept
 * behind the higher bar.
 */
export const Roles: CollectionConfig = {
  slug: 'roles',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'capabilities', 'updatedAt'],
    group: 'People',
    description:
      'A role is a set of permissions you can hand to a teammate. Admins always have every permission, regardless of roles.',
    hidden: ({ user }) => !isAdmin(user),
  },
  access: {
    // Read is wider than write: assigning a role from the Users screen needs to
    // list the available roles, and that screen is open to `users:manage`.
    read: ({ req }) => isAdmin(req.user) || can(req.user, 'users:manage'),
    create: ({ req }) => isAdmin(req.user),
    update: ({ req }) => isAdmin(req.user),
    delete: ({ req }) => isAdmin(req.user),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'What this person does, in your words. "Copywriter", "VA", "Bookkeeper".' },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'Optional. A note to your future self about who this is for.' },
    },
    {
      name: 'capabilities',
      type: 'select',
      hasMany: true,
      required: true,
      options: CAPABILITY_OPTIONS,
      admin: {
        description: `Tick everything this role may do. Handle with care: ${SENSITIVE_CAPABILITIES.join(', ')} lets someone change permissions, including their own.`,
      },
    },
  ],
}
