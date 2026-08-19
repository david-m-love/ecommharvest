import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/lib/access'

/**
 * Append-only record of consequential admin actions — granting or revoking
 * access, and impersonating a member. Deliberately not editable: an audit log
 * you can rewrite is not an audit log.
 */
export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'actor', 'subject', 'createdAt'],
    group: 'People',
  },
  access: {
    read: adminOnly,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'action', type: 'text', required: true, index: true },
    { name: 'actor', type: 'relationship', relationTo: 'users' },
    { name: 'subject', type: 'text', admin: { description: 'Who or what was acted on.' } },
    { name: 'detail', type: 'json' },
    { name: 'ip', type: 'text' },
  ],
}
