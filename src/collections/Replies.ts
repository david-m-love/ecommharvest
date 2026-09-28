import type { CollectionConfig, PayloadRequest } from 'payload'

import { isAdmin } from '@/lib/access'
import { can } from '@/lib/capabilities'
import { memberCanRead } from '@/lib/community-access'

const idOf = (value: unknown): string | number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return (value as { id?: string | number }).id ?? null
  return value as string | number
}

/**
 * Recomputes a thread's reply count and last-reply date from the replies
 * themselves.
 *
 * Counted rather than incremented on purpose. An increment is one write and it
 * is wrong the first time anything else touches the data — a reply deleted by a
 * moderator, a row removed in Payload's admin, two replies landing together —
 * and once the number has drifted nothing ever brings it back. A count is
 * cheap at this size and is always the truth.
 */
const resync = async (threadId: string | number, req: PayloadRequest) => {
  /**
   * Every query here takes `req`, and that is the whole correctness of this
   * function.
   *
   * The hook runs **inside** the transaction that is creating the reply. A
   * local-API call made without `req` opens its own connection, which cannot
   * see uncommitted rows — so the count came back one short, every single time,
   * and `lastReplyAt` was always the date of the previous reply. Nothing threw;
   * the feed simply said "0 replies" under a thread with one. Passing `req`
   * joins the same transaction, so the row being written is counted.
   *
   * One query, not two: `totalDocs` counts everything matching regardless of
   * `limit`, so asking for the single newest reply also answers how many there
   * are — and the two answers cannot disagree, which they could if they came
   * from separate reads.
   */
  const replies = await req.payload.find({
    collection: 'replies',
    where: { thread: { equals: threadId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    sort: '-createdAt',
    req,
  })

  const thread = await req.payload.findByID({
    collection: 'threads',
    id: threadId,
    depth: 0,
    overrideAccess: true,
    req,
  })

  await req.payload.update({
    collection: 'threads',
    id: threadId,
    overrideAccess: true,
    req,
    data: {
      replyCount: replies.totalDocs,
      // Back to the thread's own date when the last reply is removed, so a
      // deleted reply does not leave a thread sorting by a reply that is gone.
      lastReplyAt: replies.docs[0]?.createdAt || thread?.createdAt || new Date().toISOString(),
    },
  })
}

/**
 * An answer to a question. Flat — a reply belongs to a thread, never to another
 * reply.
 *
 * Nesting is where forum UIs get expensive: indentation rules, collapse state,
 * "load more replies", and a reading order nobody agrees on. A question and its
 * answers in the order they arrived is what this room is for.
 */
export const Replies: CollectionConfig = {
  slug: 'replies',
  labels: { singular: 'Community reply', plural: 'Community replies' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['thread', 'author', 'createdAt'],
    group: 'Community',
    hidden: ({ user }) => !isAdmin(user) && !can(user, 'community:moderate'),
  },
  access: {
    read: memberCanRead(),
    // As with threads: the route pins `author` to the session and checks both
    // membership and whether the thread is locked. This stops anonymous writes.
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => isAdmin(req.user) || can(req.user, 'community:moderate'),
    delete: ({ req }) => isAdmin(req.user) || can(req.user, 'community:moderate'),
  },
  hooks: {
    /**
     * Kept on the collection rather than in the route so a reply removed in
     * Payload's own admin updates the feed too. A denormalised count that only
     * some write paths maintain is worse than no count at all.
     */
    afterChange: [
      async ({ doc, req }) => {
        const threadId = idOf(doc.thread)
        if (threadId !== null) await resync(threadId, req)
        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        const threadId = idOf(doc.thread)
        if (threadId !== null) await resync(threadId, req)
        return doc
      },
    ],
  },
  fields: [
    { name: 'thread', type: 'relationship', relationTo: 'threads', required: true, index: true },
    { name: 'body', type: 'textarea', required: true },
    { name: 'author', type: 'relationship', relationTo: 'users', required: true, index: true },
  ],
}
