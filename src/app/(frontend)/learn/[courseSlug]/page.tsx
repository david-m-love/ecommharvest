import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppBar } from '@/components/AppBar'
import { requireUser } from '@/lib/auth'
import { getCourseTree, hasCourseAccess, payload } from '@/lib/entitlements'

type Props = { params: Promise<{ courseSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseSlug } = await params
  const tree = await getCourseTree(courseSlug)
  return {
    title: tree?.course.title || 'Course',
    robots: { index: false, follow: false },
  }
}

const formatDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return null
  const mins = Math.round(seconds / 60)
  return `${mins} min`
}

export default async function CoursePage({ params }: Props) {
  const { courseSlug } = await params
  const user = await requireUser(`/learn/${courseSlug}`)

  const tree = await getCourseTree(courseSlug)
  if (!tree) notFound()

  const { course, modules } = tree
  const hasAccess = await hasCourseAccess(user, course.id)

  const p = await payload()
  const progress = await p.find({
    collection: 'progress',
    where: { and: [{ user: { equals: user.id } }, { course: { equals: course.id } }] },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })
  const completed = new Set(
    progress.docs
      .filter((row) => row.completedAt)
      .map((row) => String(typeof row.lesson === 'object' ? row.lesson?.id : row.lesson)),
  )

  const allLessons = modules.flatMap((m) => m.lessons)
  const total = allLessons.length
  const done = allLessons.filter((l) => completed.has(String(l.id))).length
  const pct = total ? Math.round((done / total) * 100) : 0

  // "Resume" points at the first incomplete lesson, or the first lesson if none.
  const resume = allLessons.find((l) => !completed.has(String(l.id))) || allLessons[0]

  return (
    <>
      <AppBar user={user} />
      <main className="shell">
        <div className="pagehead">
          <h1>{course.title}</h1>
          {course.subtitle && <p>{course.subtitle}</p>}
        </div>

        {!hasAccess && (
          <p className="flash flash-error">
            You don&rsquo;t have access to this course yet. Preview lessons are playable; the rest
            unlock once you&rsquo;re enrolled.
          </p>
        )}

        {hasAccess && total > 0 && (
          <div className="courseprogress">
            <div className="bar">
              <span style={{ width: `${pct}%` }} />
            </div>
            <p className="bar-label">
              {done} of {total} complete &middot; {pct}%
            </p>
          </div>
        )}

        {resume && hasAccess && (
          <div className="cta-row cta-row-2 resumerow">
            <Link href={`/learn/${course.slug}/${resume.slug}`} className="btn">
              {done === 0 ? 'Start the course' : done === total ? 'Review from the start' : 'Resume'}
            </Link>
          </div>
        )}

        {modules.length === 0 ? (
          <div className="empty">
            <strong>No lessons published yet</strong>
            This course is still being built.
          </div>
        ) : (
          <ul className="curriculum">
            {modules.map((mod, modIndex) => (
              <li key={mod.id} className="mod">
                <div className="mod-head">
                  <h3>
                    {modIndex + 1}. {mod.title}
                  </h3>
                  {mod.summary && <p>{mod.summary}</p>}
                </div>
                <ul className="lesson-list">
                  {mod.lessons.map((lesson) => {
                    const playable = hasAccess || lesson.isPreview
                    const isDone = completed.has(String(lesson.id))
                    const duration = formatDuration(lesson.durationSeconds)
                    const meta = [
                      lesson.isPreview && !hasAccess ? 'Preview' : null,
                      duration,
                      lesson.videoStatus !== 'ready' ? 'Video coming' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')

                    const inner = (
                      <>
                        <span className={isDone ? 'tickbox is-done' : 'tickbox'} aria-hidden="true">
                          {isDone ? '✓' : ''}
                        </span>
                        <span className="lesson-title">{lesson.title}</span>
                        <span className="lesson-meta">{meta || (playable ? '' : 'Locked')}</span>
                      </>
                    )

                    return playable ? (
                      <li key={lesson.id}>
                        <Link href={`/learn/${course.slug}/${lesson.slug}`} className="lesson-row">
                          {inner}
                        </Link>
                      </li>
                    ) : (
                      <li key={lesson.id}>
                        <div className="lesson-row" aria-disabled="true">
                          {inner}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
