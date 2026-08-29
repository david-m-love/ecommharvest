import React from 'react'

import { BlockImage } from '@/blocks/BlockImage'
import { toHref } from '@/lib/href'

/**
 * Lexical rich text, rendered into the site's own typography.
 *
 * Payload stores what the editor produced as a tree of nodes. This walks it and
 * emits ordinary HTML — no classes of its own, so an article inherits the same
 * headings, links and lists as every other page, and a post can never come out
 * looking like a different website.
 *
 * Two rules it follows throughout:
 *
 *  1. **An unknown node renders its children rather than nothing.** A Payload
 *     upgrade that adds a node type, or a feature switched on later, then
 *     degrades to plain text instead of silently deleting a paragraph. Losing
 *     someone's writing because a renderer did not recognise a wrapper is not a
 *     failure worth risking to save a few lines.
 *  2. **Nothing here trusts the shape of the data.** It is JSON from a database
 *     column; every access is guarded, because a malformed tree must not take
 *     the page down with it.
 */

type Node = {
  type?: string
  version?: number
  children?: Node[]
  // Text nodes
  text?: string
  format?: number | string
  // Headings and lists
  tag?: string
  listType?: string
  // Links
  fields?: { url?: string; newTab?: boolean; linkType?: string; doc?: unknown }
  url?: string
  // Uploads
  value?: { url?: string; alt?: string; width?: number; height?: number } | number | string
  relationTo?: string
}

/** Lexical stores text styling as a bitmask on each run. */
const BOLD = 1
const ITALIC = 1 << 1
const STRIKETHROUGH = 1 << 2
const UNDERLINE = 1 << 3
const CODE = 1 << 4

const renderText = (node: Node, key: React.Key): React.ReactNode => {
  const text = node.text ?? ''
  if (!text) return null
  const format = typeof node.format === 'number' ? node.format : 0

  let element: React.ReactNode = text
  // Innermost first, so the nesting reads the way the marks were applied.
  if (format & CODE) element = <code>{element}</code>
  if (format & BOLD) element = <strong>{element}</strong>
  if (format & ITALIC) element = <em>{element}</em>
  if (format & UNDERLINE) element = <u>{element}</u>
  if (format & STRIKETHROUGH) element = <s>{element}</s>
  return <React.Fragment key={key}>{element}</React.Fragment>
}

const renderChildren = (nodes: Node[] | undefined): React.ReactNode =>
  (nodes || []).map((child, index) => renderNode(child, index))

const renderNode = (node: Node | undefined, key: React.Key): React.ReactNode => {
  if (!node || typeof node !== 'object') return null

  switch (node.type) {
    case 'text':
      return renderText(node, key)

    case 'linebreak':
      return <br key={key} />

    case 'paragraph': {
      const children = renderChildren(node.children)
      // Lexical keeps empty paragraphs as spacing; an empty <p> is just a gap in
      // the flow of an article, so it is dropped.
      if (!node.children?.some((child) => (child.text ?? '').trim() || child.type !== 'text')) {
        return null
      }
      return <p key={key}>{children}</p>
    }

    case 'heading': {
      /**
       * h1 is demoted to h2. The post's title is already the h1 on the page, and
       * a second one makes the document outline ambiguous for search engines and
       * for anyone navigating by heading.
       */
      const tag = node.tag === 'h1' ? 'h2' : node.tag || 'h2'
      const Tag = (['h2', 'h3', 'h4', 'h5', 'h6'].includes(tag) ? tag : 'h2') as 'h2'
      return <Tag key={key}>{renderChildren(node.children)}</Tag>
    }

    case 'list': {
      const Tag = node.listType === 'number' ? 'ol' : 'ul'
      return <Tag key={key}>{renderChildren(node.children)}</Tag>
    }

    case 'listitem':
      return <li key={key}>{renderChildren(node.children)}</li>

    case 'quote':
      return <blockquote key={key}>{renderChildren(node.children)}</blockquote>

    case 'horizontalrule':
      return <hr key={key} />

    case 'link':
    case 'autolink': {
      const raw = node.fields?.url || node.url
      const href = toHref(typeof raw === 'string' ? raw : undefined)
      // A link with nowhere to go is still words somebody wrote.
      if (!href) return <React.Fragment key={key}>{renderChildren(node.children)}</React.Fragment>
      const external = /^(https?:)?\/\//i.test(href)
      return (
        <a
          key={key}
          href={href}
          {...(node.fields?.newTab || external ? { target: '_blank', rel: 'noopener' } : {})}
        >
          {renderChildren(node.children)}
        </a>
      )
    }

    case 'upload': {
      /**
       * An image the writer dropped into the article. `value` is the media
       * record when the field was loaded with depth — at depth 0 it is just an
       * id, and there is nothing to draw, so nothing is drawn.
       */
      const media = typeof node.value === 'object' && node.value ? node.value : null
      if (!media?.url) return null
      return (
        <figure key={key} className="articleimage">
          <BlockImage
            image={{ url: media.url, alt: media.alt, width: media.width, height: media.height }}
            sizes="(max-width: 760px) 100vw, 720px"
          />
          {media.alt ? <figcaption>{media.alt}</figcaption> : null}
        </figure>
      )
    }

    default:
      // Unknown wrapper: keep what is inside it.
      return <React.Fragment key={key}>{renderChildren(node.children)}</React.Fragment>
  }
}

/** True when there is something to render — used to decide "this post is empty". */
export const richTextIsEmpty = (value: unknown): boolean => {
  const root = (value as { root?: Node })?.root
  const children = root?.children
  if (!Array.isArray(children) || children.length === 0) return true
  return !children.some((node) => plainText(node).trim().length > 0 || node.type === 'upload')
}

/**
 * Everything a node says, with the formatting removed.
 *
 * Used for the parts of a post that cannot carry markup: the meta description,
 * the feed summary, and a reading time. Kept here so there is one definition of
 * "the words in this article".
 */
const plainText = (node: Node | undefined): string => {
  if (!node) return ''
  if (typeof node.text === 'string') return node.text
  return (node.children || []).map(plainText).join(' ')
}

export const richTextToPlain = (value: unknown): string => {
  const root = (value as { root?: Node })?.root
  return (root?.children || [])
    .map(plainText)
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/** Whole minutes, at the 200 words a minute most people read prose at. */
export const readingMinutes = (value: unknown): number => {
  const words = richTextToPlain(value).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

export function RichText({ value }: { value: unknown }) {
  const root = (value as { root?: Node })?.root
  if (!root?.children) return null
  return <>{renderChildren(root.children)}</>
}
