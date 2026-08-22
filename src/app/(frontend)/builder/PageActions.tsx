'use client'

import React from 'react'

/**
 * Duplicate and Delete, as form posts.
 *
 * A client component for one reason: Delete asks first. Everything else here is
 * a plain form, so the list still works if the JavaScript never arrives — the
 * confirm is the only part that needs a browser, and losing it degrades to
 * "deletes immediately", which is why the server checks permissions again and
 * refuses on the pages the site's routes depend on.
 */
export function PageActions({
  pageId,
  title,
  isPublished,
  canPublish,
  isProtected,
}: {
  pageId: number
  title: string
  isPublished: boolean
  canPublish: boolean
  isProtected: boolean
}) {
  const confirmDelete = (event: React.FormEvent) => {
    const warning = isPublished
      ? `Delete "${title}"? It is live — the page will stop working for anyone who visits it.`
      : `Delete the draft "${title}"? This cannot be undone.`
    if (!window.confirm(warning)) event.preventDefault()
  }

  return (
    <>
      <form action={`/api/builder/${pageId}/actions`} method="post" style={{ display: 'inline' }}>
        <input type="hidden" name="action" value="duplicate" />
        <button type="submit" className="minibtn">
          Duplicate
        </button>
      </form>

      {/*
        The site's own pages — /, /masterclass, /privacy, /terms — have no delete
        button at all. Showing one that always refuses teaches people the button
        is broken; the reason belongs where the button would have been.
      */}
      {isProtected ? (
        <span className="stamp" title="The site's routes render this page">
          Part of the site
        </span>
      ) : isPublished && !canPublish ? (
        <span className="stamp">Live — an admin can remove it</span>
      ) : (
        <form
          action={`/api/builder/${pageId}/actions`}
          method="post"
          onSubmit={confirmDelete}
          style={{ display: 'inline' }}
        >
          <input type="hidden" name="action" value="delete" />
          <button type="submit" className="minibtn minibtn-danger">
            Delete
          </button>
        </form>
      )}
    </>
  )
}
