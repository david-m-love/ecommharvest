import type { Metadata } from 'next'
import Link from 'next/link'

import { AppBar } from '@/components/AppBar'
import { requireUser } from '@/lib/auth'
import { accessibleCourseIds, payload } from '@/lib/entitlements'

export const metadata: Metadata = {
  title: 'My courses',
  robots: { index: false, follow: false },
}

export default async function LearnPage() {
  const user = await requireUser('/learn')
  const p = await payload()

  const [courses, unlocked] = await Promise.all([
    p.find({
      collection: 'courses',
      where: { _status: { equals: 'published' } },
      limit: 100,
      depth: 1,
      sort: 'createdAt',
      overrideAccess: true,
    }),
    accessibleCourseIds(user),
  ])

  // One query for all of this user's completions, rather than one per course.
  const completions = await p.find({
    collection: 'progress',
    where: { and: [{ user: { equals: user.id } }, { completedAt: { exists: true } }] },
    limit: 2000,
    depth: 0,
    overrideAccess: true,
  })
  const doneByCourse = new Map<string, number>()
  for (const row of completions.docs) {
    const key = String(typeof row.course === 'object' ? row.course?.id : row.course)
    doneByCourse.set(key, (doneByCourse.get(key) || 0) + 1)
  }

  // Lesson totals per course, again in one pass.
  const lessonCounts = new Map<string, number>()
  const modules = await p.find({ collection: 'modules', limit: 500, depth: 0, overrideAccess: true })
  const moduleToCourse = new Map<string, string>()
  for (const m of modules.docs) {
    moduleToCourse.set(String(m.id), String(typeof m.course === 'object' ? m.course?.id : m.course))
  }
  const lessons = await p.find({
    collection: 'lessons',
    where: { _status: { equals: 'published' } },
    limit: 2000,
    depth: 0,
    overrideAccess: true,
  })
  for (const l of lessons.docs) {
    const courseId = moduleToCourse.get(String(typeof l.module === 'object' ? l.module?.id : l.module))
    if (courseId) lessonCounts.set(courseId, (lessonCounts.get(courseId) || 0) + 1)
  }

  return (
    <>
      <AppBar user={user} current="learn" />
      <main className="shell">
        <div className="pagehead">
          <h1>{user.name ? `Welcome back, ${user.name.split(' ')[0]}.` : 'My courses'}</h1>
          <p>Pick up where you left off.</p>
        </div>

        {courses.docs.length === 0 ? (
          <div className="empty">
            <strong>No courses published yet</strong>
            Courses will appear here as soon as they go live.
          </div>
        ) : (
          <div className="courses">
            {courses.docs.map((course) => {
              const id = String(course.id)
              const hasAccess = unlocked.has(id)
              const total = lessonCounts.get(id) || 0
              const done = doneByCourse.get(id) || 0
              const pct = total > 0 ? Math.round((done / total) * 100) : 0

              return (
                <Link key={id} href={`/learn/${course.slug}`} className="coursecard">
                  <div className="coursecard-body">
                    <h2>{course.title}</h2>
                    <p>{course.excerpt || course.subtitle}</p>
                    {hasAccess && total > 0 && (
                      <div style={{ marginTop: 20 }}>
                        <div className="bar">
                          <span style={{ width: `${pct}%` }} />
                        </div>
                        <p className="bar-label">
                          {done} of {total} lessons &middot; {pct}%
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="coursecard-foot">
                    <span className={hasAccess ? 'lockpill is-open' : 'lockpill'}>
                      {hasAccess ? 'Enrolled' : 'Locked'}
                    </span>
                    <span>
                      {total} {total === 1 ? 'lesson' : 'lessons'}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
