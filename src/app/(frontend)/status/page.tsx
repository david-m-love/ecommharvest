import type { Metadata } from 'next'
import React from 'react'

/**
 * A plain-English health page, for the one failure that otherwise shows nothing.
 *
 * When the app cannot reach its database, `/admin` returns a 500 and the browser
 * shows a blank white page — no message, no clue. Meanwhile the public pages
 * keep working, because they fall back to the built-in copy. So the site looks
 * fine and the admin looks broken, which points at exactly the wrong thing.
 *
 * This page answers "what is actually wrong" in sentences, with nothing to
 * install and nothing to log into — which matters, because when this breaks,
 * logging in is the thing you cannot do.
 *
 * Deliberately public, and deliberately careful about what it says: whether a
 * setting is present, never its value; the database's error *code*, never its
 * host, user or password. It also opens its own connection with a short timeout
 * rather than going through Payload, so a broken Payload cannot take this page
 * down with it.
 */

export const metadata: Metadata = {
  title: 'Status',
  robots: { index: false, follow: false },
}

type Check = {
  label: string
  ok: boolean
  detail: string
  /** What to do about it, when it is not ok. */
  fix?: string
}

/**
 * Postgres and the network fail in a handful of distinct ways, and each one has
 * a different cause. Saying which turns "the database is down" into a specific
 * next action.
 */
const explainDbError = (err: unknown): { detail: string; fix: string } => {
  const code = (err as { code?: string })?.code ?? ''
  const message = err instanceof Error ? err.message : String(err)

  if (code === 'ETIMEDOUT' || /timeout/i.test(message))
    return {
      detail: 'Timed out waiting for the database to answer.',
      fix:
        'Usually a sleeping database. Neon on the free plan pauses after a few minutes idle and can be slow to wake. Reload this page once or twice; if it keeps timing out, open the database in Neon and check it is not suspended.',
    }
  if (code === 'ENOTFOUND')
    return {
      detail: 'The database hostname does not exist any more.',
      fix:
        'The connection string points at a database that has been deleted or recreated. In Vercel: Storage, open the database, copy its pooled connection string, and paste it into the DATABASE_URI environment variable. Then redeploy.',
    }
  if (code === 'ECONNREFUSED')
    return {
      detail: 'The database refused the connection.',
      fix:
        'Right hostname, nothing listening. Check the database still exists in Vercel under Storage, then copy its pooled connection string into DATABASE_URI and redeploy.',
    }
  if (code === '28P01' || code === '28000')
    return {
      detail: 'The database rejected the username or password.',
      fix:
        'The password in DATABASE_URI is out of date — this happens when a database is recreated. Copy the current pooled connection string from Vercel Storage into DATABASE_URI and redeploy.',
    }
  if (code === '3D000')
    return {
      detail: 'That database name does not exist on the server.',
      fix:
        'The connection string names a database that is not there. Copy the pooled connection string straight from Vercel Storage rather than editing it by hand, then redeploy.',
    }
  return {
    detail: `The database could not be reached${code ? ` (${code})` : ''}.`,
    fix: 'Check the database is running in Vercel under Storage, then redeploy.',
  }
}

/**
 * Connects directly with `pg` rather than through Payload, with a short timeout
 * so this page answers quickly even when the database is unreachable.
 */
const checkDatabase = async (): Promise<Check[]> => {
  if (!process.env.DATABASE_URI)
    return [
      {
        label: 'Database connection',
        ok: false,
        detail: 'No database is configured.',
        fix:
          'In Vercel: Settings, Environment Variables, add DATABASE_URI with the pooled connection string from Storage. Then redeploy.',
      },
    ]

  const { Client } = await import('pg')
  const client = new Client({
    connectionString: process.env.DATABASE_URI,
    connectionTimeoutMillis: 8_000,
    // Vercel-hosted Postgres presents a certificate this app does not pin, and
    // the connection is inside the provider's network. Matches the app's own
    // database settings so this page tests the same path the app uses.
    ssl: process.env.DATABASE_URI.includes('localhost') ? false : { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    const { rows } = await client.query<{ name: string }>(
      `select name from payload_migrations order by id desc limit 1`,
    )
    const latest = rows[0]?.name
    return [
      { label: 'Database connection', ok: true, detail: 'Connected.' },
      latest
        ? { label: 'Database tables', ok: true, detail: `Up to date — last migration "${latest}".` }
        : {
            label: 'Database tables',
            ok: false,
            detail: 'Connected, but no migrations have run.',
            fix: 'Redeploy. The deploy runs the migrations that create the tables.',
          },
    ]
  } catch (err) {
    // A missing migrations table means the connection worked but the schema is
    // absent — a different problem with a different fix, so say so.
    if ((err as { code?: string })?.code === '42P01')
      return [
        { label: 'Database connection', ok: true, detail: 'Connected.' },
        {
          label: 'Database tables',
          ok: false,
          detail: 'Connected, but the tables have not been created.',
          fix: 'Redeploy. The deploy runs the migrations that create the tables.',
        },
      ]
    const { detail, fix } = explainDbError(err)
    return [{ label: 'Database connection', ok: false, detail, fix }]
  } finally {
    await client.end().catch(() => {})
  }
}

const settingChecks = (): Check[] => [
  {
    label: 'Login secret',
    ok: Boolean(process.env.PAYLOAD_SECRET),
    detail: process.env.PAYLOAD_SECRET ? 'Set.' : 'Missing — nobody can sign in without it.',
    fix: 'In Vercel: Settings, Environment Variables, add PAYLOAD_SECRET set to any long random string. Then redeploy.',
  },
  {
    label: 'Image and file storage',
    ok: Boolean(process.env.BLOB_READ_WRITE_TOKEN) || !process.env.VERCEL,
    detail: process.env.BLOB_READ_WRITE_TOKEN
      ? 'Connected — uploads are kept.'
      : process.env.VERCEL
        ? 'Not connected. Uploads are refused rather than silently lost.'
        : 'Running locally, so uploads go to disk.',
    fix: 'In Vercel: Storage, Create Database, Blob. Choose Public access, then redeploy.',
  },
]

export default async function StatusPage() {
  const checks = [...(await checkDatabase()), ...settingChecks()]
  const broken = checks.filter((c) => !c.ok)

  return (
    <main className="slot">
      <div className="slot-in">
        <p className="eyebrow">Status</p>
        <h1>{broken.length === 0 ? 'Everything is working.' : 'Something needs fixing.'}</h1>
        <p className="lede">
          {broken.length === 0
            ? 'The site can reach its database, and the admin at /admin should load.'
            : 'The public pages keep working from built-in copy, which is why they look fine. The admin cannot, so it shows a blank page until this is sorted.'}
        </p>

        <div className="cols-1" style={{ marginTop: 34 }}>
          {checks.map((check) => (
            <div className="card" key={check.label}>
              <h3 style={{ margin: '0 0 6px' }}>
                {check.ok ? '✓' : '✗'} {check.label}
              </h3>
              <p style={{ margin: 0 }}>{check.detail}</p>
              {!check.ok && check.fix ? (
                <p className="plus" style={{ marginTop: 12, marginBottom: 0 }}>
                  <strong>What to do:</strong> {check.fix}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <p className="stamp" style={{ marginTop: 34 }}>
          This page shows whether each setting is present, never its value.
        </p>
      </div>
    </main>
  )
}
