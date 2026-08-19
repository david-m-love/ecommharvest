import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload } from 'payload'

import type { Entitlement, User } from '@/payload-types'

/**
 * Append-only audit trail for consequential actions.
 *
 * Implemented as collection hooks rather than inline calls in each route, so a
 * grant made by clicking around Payload's own admin UI is recorded exactly like
 * one made through our API. Anything that changes access gets logged, whatever
 * path it took.
 */

const idOf = (value: unknown): string =>
  value && typeof value === 'object'
    ? String((value as { id?: unknown }).id ?? '')
    : String(value ?? '')

export const writeAudit = async (
  payload: Payload,
  entry: {
    action: string
    actorId?: string | number | null
    subject?: string
    detail?: Record<string, unknown>
    ip?: string
  },
) => {
  try {
    await payload.create({
      collection: 'audit-log',
      data: {
        action: entry.action,
        actor: entry.actorId ? Number(entry.actorId) : null,
        subject: entry.subject,
        detail: entry.detail,
        ip: entry.ip,
      },
      overrideAccess: true, // the collection refuses creates from everyone else
    })
  } catch (err) {
    // Never let an audit failure break the action being audited — but do make
    // the failure visible, since a silently broken audit log is worse than none.
    console.error('audit: failed to write entry', entry.action, err)
  }
}

/**
 * Records grants, revokes, and restores on entitlements. Distinguishes them by
 * comparing revokedAt before and after, so the log reads as intent rather than
 * as a diff.
 */
export const auditEntitlementChange: CollectionAfterChangeHook<Entitlement> = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const wasRevoked = Boolean(previousDoc?.revokedAt)
  const isRevoked = Boolean(doc.revokedAt)

  let action: string
  if (operation === 'create') {
    action = isRevoked ? 'entitlement.created_revoked' : 'entitlement.granted'
  } else if (!wasRevoked && isRevoked) {
    action = 'entitlement.revoked'
  } else if (wasRevoked && !isRevoked) {
    action = 'entitlement.restored'
  } else {
    action = 'entitlement.updated'
  }

  await writeAudit(req.payload, {
    action,
    actorId: (req.user as User | null)?.id ?? null,
    subject: `user:${idOf(doc.user)} course:${idOf(doc.course)}`,
    detail: {
      entitlementId: doc.id,
      source: doc.source,
      sourceReference: doc.sourceReference,
      expiresAt: doc.expiresAt,
      revokedAt: doc.revokedAt,
    },
  })

  return doc
}

/** Deleting an entitlement destroys history, so it is worth recording loudly. */
export const auditEntitlementDelete: CollectionAfterDeleteHook<Entitlement> = async ({
  doc,
  req,
}) => {
  await writeAudit(req.payload, {
    action: 'entitlement.deleted',
    actorId: (req.user as User | null)?.id ?? null,
    subject: `user:${idOf(doc.user)} course:${idOf(doc.course)}`,
    detail: { entitlementId: doc.id, source: doc.source },
  })
  return doc
}

/** Role changes are the other privilege-relevant edit. */
export const auditUserRoleChange: CollectionAfterChangeHook<User> = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (operation !== 'update') return doc
  const before = [...(previousDoc?.roles || [])].sort().join(',')
  const after = [...(doc.roles || [])].sort().join(',')
  if (before === after) return doc

  await writeAudit(req.payload, {
    action: 'user.roles_changed',
    actorId: (req.user as User | null)?.id ?? null,
    subject: `user:${doc.id} (${doc.email})`,
    detail: { from: before, to: after },
  })
  return doc
}
