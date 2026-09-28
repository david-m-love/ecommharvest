import type { CollectionConfig } from 'payload'

import { isAdmin } from '@/lib/access'
import { can, requireCapabilityField } from '@/lib/capabilities'
import { memberCanRead } from '@/lib/community-access'
import { slugify } from '@/lib/slug'

/**
 * A question somebody is working through, and the thread of answers under it.
 *
 * The room is async Q&A, not chat: a thread has a title because the point is
 * that it can be found again in March by somebody with the same problem. That
 * single decision is why this is a collection with slugs rather than a message
 * log with timestamps.
 *
 * Bodies are plain text. The Lexical renderer in `lib/rich-text.tsx` would draw
 * rich text beautifully, but the *editor* is Payload's admin component and
 * there is no front-end one here — shipping rich text would mean importing an
 * editor and then sanitising member-authored HTML forever after. A textarea has
 * no XSS surface at all, and it is what people type into anyway.
 */
export const Threads: CollectionConfig = {
  slug: 'threads',
  labels: { singular: 'Community thread', plural: 'Community threads' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'pinned', 'replyCount', 'lastReplyAt', 'lockedAt'],
    group: 'Community',
    hidden: ({ user }) => !isAdmin(user) && !can(user, 'community:moderate'),
  },
  access: {
    /**
     * Membership, not a session, and not a role.
     *
     * This matters more than it looks. Payload publishes a REST endpoint for
     * every collection, so `/api/threads` is reachable by anyone with a cookie
     * whatever the pages do — and every masterclass registrant has a cookie and
     * `roles: ['member']`, because the sign-in flow creates accounts on demand.
     * Gating on the entitlement is the only check that distinguishes the people
     * who paid.
     */
    read: memberCanRead(),
    /**
     * Any signed-in user may create, and the route handler pins `author` to the
     * session — the same guarantee `Progress` gives, by construction rather
     * than by validation. The route also checks membership; this rule only has
     * to stop an anonymous write.
     */
    create: ({ req }) => Boolean(req.user),
    /**
     * Editing somebody's words is moderation, not authorship. There is no
     * member-facing edit in the MVP, so the only writes are pinning and
     * locking, and both are a moderator's job.
     */
    update: ({ req }) => isAdmin(req.user) || can(req.user, 'community:moderate'),
    delete: ({ req }) => isAdmin(req.user) || can(req.user, 'community:moderate'),
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation, req, originalDoc }) => {
        if (!data) return data

        if (operation === 'create') {
          /**
           * A slug that is unique without being a UUID.
           *
           * Two people asking "Black Friday discount depth?" in the same week is
           * the normal case, not the exotic one, so a collision cannot be an
           * error the poster sees — their question would simply fail to send.
           * The suffix is the smallest thing that keeps the URL readable.
           */
          const base = slugify(String(data.title || '')) || 'question'
          let candidate = base
          for (let n = 2; n < 60; n++) {
            const clash = await req.payload.find({
              collection: 'threads',
              where: { slug: { equals: candidate } },
              limit: 1,
              depth: 0,
              overrideAccess: true,
            })
            if (clash.totalDocs === 0) break
            candidate = `${base}-${n}`
          }
          data.slug = candidate
          // A thread with no replies still has to sort somewhere, and "when it
          // was asked" is the honest answer.
          data.lastReplyAt = data.lastReplyAt || new Date().toISOString()
        }

        if (operation === 'update' && originalDoc) {
          // The URL is the thing people bookmark and search. Renaming a thread
          // must not quietly break every link to it.
          data.slug = (originalDoc as { slug?: string }).slug
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 140,
      admin: { description: 'The question, as somebody would search for it later.' },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Generated from the title when the thread is posted, and then fixed.',
      },
    },
    { name: 'body', type: 'textarea', required: true },
    { name: 'author', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'pinned',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      // Field-level as well as collection-level: without this a moderator-less
      // update path could still flip it. Pinning is how the weekly call sits at
      // the top of the room, so it is not a member's to set.
      access: {
        create: requireCapabilityField('community:moderate'),
        update: requireCapabilityField('community:moderate'),
      },
      admin: { description: 'Pinned threads sort above everything else.' },
    },
    {
      name: 'lockedAt',
      type: 'date',
      access: {
        create: requireCapabilityField('community:moderate'),
        update: requireCapabilityField('community:moderate'),
      },
      admin: { description: 'Set to close the thread to new replies. It stays readable.' },
    },
    {
      /**
       * Denormalised so the feed is one query.
       *
       * The alternative is a count per thread on every page load, which is fine
       * at twelve threads and is the reason forum home pages get slow. Both
       * fields are maintained by the Replies hook.
       */
      name: 'lastReplyAt',
      type: 'date',
      index: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'replyCount',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}
