import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Makes the very first user an admin, whatever the form said.
 *
 * Payload shows a "create first user" screen when the users table is empty, and
 * creates that user with `overrideAccess: true` — so the `roles` field's
 * admin-only write guard does not apply. But `roles` still defaults to
 * `['member']`, and the screen presents it as an ordinary editable field.
 *
 * Leave it on the default and you create a member, land on "unauthorized", and
 * are locked out for good: the first-user route disappears the moment a user
 * exists, so there is no second attempt and no way back in without opening the
 * database by hand. On a fresh production deployment that is a dead end reached
 * by doing nothing wrong.
 *
 * So the first account is an admin by construction. Every later account is
 * unaffected and still defaults to member.
 *
 * The count runs on `req` so it joins the same transaction as the insert, and at
 * `beforeChange` time the new row is not yet visible — `0` therefore means "this
 * is the first user" rather than "there are no users at all".
 */
export const ensureFirstUserIsAdmin: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create') return data

  const { totalDocs } = await req.payload.count({
    collection: 'users',
    overrideAccess: true,
    req,
  })
  if (totalDocs > 0) return data

  const roles = new Set<string>(Array.isArray(data.roles) ? data.roles : [])
  roles.add('admin')
  // Member too, so the same account can also open the course area.
  roles.add('member')

  req.payload.logger.info(
    `First user ${data.email ?? ''} created as an admin — otherwise nobody could sign in.`,
  )

  return { ...data, roles: [...roles] }
}
