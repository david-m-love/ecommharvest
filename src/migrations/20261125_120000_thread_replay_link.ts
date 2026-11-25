import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * A replay link on a community thread.
 *
 * One nullable text column, so every existing thread keeps working exactly as it
 * did and nothing is backfilled. `IF NOT EXISTS`, because a development database
 * running in push mode may already have the column.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "threads" ADD COLUMN IF NOT EXISTS "replay_url" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "threads" DROP COLUMN IF EXISTS "replay_url";`)
}
