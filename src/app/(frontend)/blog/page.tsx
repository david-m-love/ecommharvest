import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { BlockImage } from '@/blocks/BlockImage'
import { SiteFooterBar, SiteHeaderBar } from '@/blocks/SiteHeaderBar'
import { formatPostDate, listPosts, postCover, postDate, postPath } from '@/lib/blog'
import { getSiteStyles } from '@/lib/site-styles'
import { absolute } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Practical writing on Q4 planning, offers, email and SMS, and paid social for LDS e-commerce founders.',
  alternates: { canonical: '/blog' },
}

/**
 * The blog index.
 *
 * Deliberately plain: a picture, a date, a headline and the first sentences. The
 * excerpt is what decides whether anyone opens the post, which is why the field
 * that holds it says so.
 */
/**
 * The wording, when Site Styles has not been given any.
 *
 * A default rather than a blank: an index with no heading looks broken, and the
 * point of the field is to let this be changed, not to require it.
 */
const HEADING = 'Notes on selling more, without burning the quarter.'
const INTRO =
  'What is working in e-commerce right now — promotions, offers, email and SMS, and paid social — written for founders doing this alongside everything else.'

export default async function BlogIndex() {
  const [{ posts }, styles] = await Promise.all([listPosts({ limit: 24 }), getSiteStyles()])

  return (
    <>
      {/* Routes written in code get the same bar as pages built in the builder —
          a visitor who arrives here from a search result needs the logo and the
          menu as much as one who came through the front door. */}
      <SiteHeaderBar
        logoUrl={styles.logoUrl}
        logoText={styles.logoText}
        logoWidth={styles.logoWidth}
        logoHeight={styles.logoHeight}
        links={styles.navLinks}
      />
      <main>
      <section className="slot">
        <div className="slot-in">
          <p className="eyebrow">Blog</p>
          <h1>{styles.blogHeading || HEADING}</h1>
          <p className="lede">{styles.blogIntro || INTRO}</p>
        </div>
      </section>

      <section className="slot wash">
        <div className="slot-in">
          {posts.length === 0 ? (
            <p className="lede">Nothing published yet. The first piece is on its way.</p>
          ) : (
            <div className="postcards">
              {posts.map((post) => {
                const cover = postCover(post)
                const date = postDate(post)
                return (
                  <article key={post.id} className="postcard">
                    <Link href={postPath(post.slug)} className="postcard-link">
                      {cover ? (
                        <span className="postcard-cover">
                          <BlockImage
                            image={cover}
                            fallbackAlt={post.title}
                            sizes="(max-width: 760px) 100vw, 380px"
                          />
                        </span>
                      ) : null}
                      <span className="postcard-body">
                        {date ? (
                          <time className="stamp" dateTime={date.toISOString()}>
                            {formatPostDate(date)}
                          </time>
                        ) : null}
                        <h2 className="postcard-title">{post.title}</h2>
                        {post.excerpt ? <span className="postcard-excerpt">{post.excerpt}</span> : null}
                      </span>
                    </Link>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/*
        Structured data for the index. It tells a search engine these separate
        cards are one publication, which is what earns the site name rather than
        a page title in results.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'eCommHarvest',
            url: absolute('/blog'),
            blogPost: posts.slice(0, 10).map((post) => ({
              '@type': 'BlogPosting',
              headline: post.title,
              url: absolute(postPath(post.slug)),
              datePublished: postDate(post)?.toISOString(),
            })),
          }),
        }}
      />
      </main>
      <SiteFooterBar />
    </>
  )
}
