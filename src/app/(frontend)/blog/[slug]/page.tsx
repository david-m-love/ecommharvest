import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { BlockImage } from '@/blocks/BlockImage'
import { SiteFooterBar, SiteHeaderBar } from '@/blocks/SiteHeaderBar'
import { findPost, formatPostDate, postCover, postDate, postPath, postVisible } from '@/lib/blog'
import { RichText, readingMinutes, richTextIsEmpty, richTextToPlain } from '@/lib/rich-text'
import { getSiteStyles } from '@/lib/site-styles'
import { absolute } from '@/lib/site-url'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await findPost(slug)
  if (!post || !(await postVisible(post))) return { title: 'Not found' }

  const cover = postCover(post)
  /**
   * The excerpt if there is one, otherwise the opening of the article. Better a
   * description drawn from the writing than none at all — an empty description
   * lets a search engine invent one out of whatever text it finds first.
   */
  const description = post.excerpt || richTextToPlain(post.body).slice(0, 180) || undefined

  return {
    title: post.title,
    description,
    alternates: { canonical: postPath(post.slug) },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: absolute(postPath(post.slug)),
      publishedTime: postDate(post)?.toISOString(),
      // The post's own picture when it has one; the site card is the fallback,
      // inherited from the layout.
      ...(cover ? { images: [{ url: absolute(cover.url) }] } : {}),
    },
    // A draft is never indexable whatever the checkbox says: a draft that got
    // crawled is the accident the checkbox exists to prevent.
    robots:
      post.noindex || post.status !== 'published' ? { index: false, follow: false } : undefined,
  }
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = await findPost(slug)
  if (!post || !(await postVisible(post))) notFound()

  const cover = postCover(post)
  const date = postDate(post)
  const empty = richTextIsEmpty(post.body)
  const styles = await getSiteStyles()

  return (
    <>
      {/* The same bar as every other page. Most people arriving at an article
          have never seen the site before, so this is where they find out whose
          it is and what else is here. */}
      <SiteHeaderBar
        logoUrl={styles.logoUrl}
        logoText={styles.logoText}
        logoWidth={styles.logoWidth}
        logoHeight={styles.logoHeight}
        links={styles.navLinks}
      />
      <main>
      {post.status !== 'published' ? (
        <div className="hostbar">
          <div className="hostbar-in">
            <p className="host-label" style={{ margin: 0 }}>
              Draft preview — not visible to the public
            </p>
          </div>
        </div>
      ) : null}

      <article className="slot">
        <div className="article">
          <p className="stamp">
            <Link href="/blog" className="backlink">
              &larr; All posts
            </Link>
          </p>

          <h1>{post.title}</h1>

          <p className="article-meta">
            {date ? <time dateTime={date.toISOString()}>{formatPostDate(date)}</time> : null}
            {post.author ? <span> · {post.author}</span> : null}
            {!empty ? <span> · {readingMinutes(post.body)} min read</span> : null}
          </p>

          {post.excerpt ? <p className="lede">{post.excerpt}</p> : null}

          {cover ? (
            <figure className="articlecover">
              <BlockImage
                image={cover}
                fallbackAlt={post.title}
                sizes="(max-width: 760px) 100vw, 760px"
                priority
              />
            </figure>
          ) : null}

          {empty ? (
            <p className="lede">This post has no words in it yet.</p>
          ) : (
            <div className="articlebody">
              <RichText value={post.body} />
            </div>
          )}

          <p className="stamp" style={{ marginTop: 40 }}>
            <Link href="/blog" className="backlink">
              &larr; All posts
            </Link>
          </p>
        </div>
      </article>

      {/*
        BlogPosting, which is what lets a result show a date and a byline rather
        than just a title. Only for a published post — telling a search engine
        about a draft is the opposite of what the draft flag is for.
      */}
      {post.status === 'published' ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: post.title,
              description: post.excerpt || undefined,
              datePublished: date?.toISOString(),
              dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
              url: absolute(postPath(post.slug)),
              ...(cover ? { image: absolute(cover.url) } : {}),
              ...(post.author ? { author: { '@type': 'Person', name: post.author } } : {}),
              publisher: { '@type': 'Organization', name: 'eCommHarvest' },
            }),
          }}
        />
      ) : null}
      </main>
      <SiteFooterBar />
    </>
  )
}
