import type { CollectionConfig } from 'payload'

import { isAdmin } from '@/lib/access'
import { can, requireCapability, requireCapabilityField } from '@/lib/capabilities'
import { slugField } from '@/lib/slug'

/**
 * A page built in the drag-and-drop builder.
 *
 * The layout lives in `content` as Puck's JSON — a list of block names plus each
 * block's props. Deliberately opaque to Payload: the schema of a block belongs
 * to the block's React component in `src/blocks/`, so adding a block or a field
 * to one never means a database migration. The cost is that Payload's admin UI
 * cannot meaningfully edit `content`; that is what the builder is for, and the
 * field is hidden there to stop anyone hand-editing JSON into an invalid shape.
 *
 * Publishing is a separate capability from editing on purpose. It is the
 * difference between "write a draft" and "put it in front of customers", and it
 * is the permission most worth withholding from a new contractor.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'status', 'updatedAt'],
    group: 'Site',
    description: 'Pages you build yourself. Open one in the builder to edit its layout.',
    hidden: ({ user }) => !isAdmin(user) && !can(user, 'pages:read') && !can(user, 'pages:write'),
  },
  access: {
    /**
     * Published pages are world-readable — that is the whole point of a public
     * page. Drafts are visible only to people who can work on them, which is
     * what stops an unfinished page leaking via the REST API.
     */
    read: ({ req }) => {
      if (isAdmin(req.user) || can(req.user, 'pages:read') || can(req.user, 'pages:write')) {
        return true
      }
      return { status: { equals: 'published' } }
    },
    create: requireCapability('pages:write'),
    update: requireCapability('pages:write'),
    delete: requireCapability('pages:write'),
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'Internal name and the browser tab title.' },
    },
    ...slugField('title'),
    {
      name: 'status',
      type: 'select',
      /**
       * Not `required`, deliberately. `defaultValue` already guarantees a value
       * on create, so `required` adds nothing at runtime — but it would force
       * every caller to *send* a status, and creating a page must not need
       * permission to publish one (writing this field takes `pages:publish`).
       *
       * Everything downstream tests for `=== 'published'`, so a missing or null
       * status reads as a draft. The failure mode is a page staying private,
       * which is the right way round.
       */
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      /**
       * Separate from `update` access: someone with `pages:write` can build and
       * save all day, but flipping this to published needs `pages:publish`.
       * Covered by test/security.e2e.mjs.
       */
      access: {
        create: requireCapabilityField('pages:publish'),
        update: requireCapabilityField('pages:publish'),
      },
      admin: {
        position: 'sidebar',
        description: 'Drafts are visible only to your team.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 300,
      admin: {
        description: 'The one-line summary search engines and link previews show.',
      },
    },
    {
      name: 'content',
      type: 'json',
      admin: {
        // Hand-editing this JSON produces a page that renders as an error. The
        // builder is the only supported way in.
        hidden: true,
      },
    },
    {
      name: 'noindex',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Keep this page out of Google. Leave on for anything you are still proofing.',
      },
    },
    {
      name: 'updatedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar', readOnly: true },
      hooks: {
        // Stamped server-side rather than sent by the client, so it cannot be
        // forged to blame someone else for a change.
        beforeChange: [({ req }) => req.user?.id],
      },
    },
  ],
}
