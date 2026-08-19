import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/lib/access'

/**
 * Masterclass registrations. Previously these only went to external sinks
 * (KV / Klaviyo / webhook); keeping a copy here means the admin can see the
 * list without an export step, and survives losing access to a third party.
 */
export const Registrations: CollectionConfig = {
  slug: 'registrations',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'storeUrl', 'event', 'createdAt'],
    group: 'People',
  },
  access: {
    read: adminOnly,
    // Written only by the server-side register route, which uses the local API
    // with overrideAccess. Nothing public may create one directly.
    create: () => false,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    { name: 'email', type: 'email', required: true, index: true },
    { name: 'name', type: 'text' },
    { name: 'storeUrl', type: 'text' },
    {
      name: 'event',
      type: 'text',
      defaultValue: 'q4-masterclass-2026-09-03',
      index: true,
      admin: { description: 'Which event this registration was for.' },
    },
    { name: 'consent', type: 'checkbox', defaultValue: false },
    {
      type: 'collapsible',
      label: 'Request metadata',
      admin: { initCollapsed: true },
      fields: [
        { name: 'ip', type: 'text' },
        { name: 'userAgent', type: 'text' },
        { name: 'referer', type: 'text' },
      ],
    },
  ],
}
