import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { FIRST_POST_BODY, FIRST_POST_EXCERPT, FIRST_POST_TITLE } from '../seed/first-post'

/**
 * The blog: a `posts` table, and two new capabilities so writing posts can be
 * handed to someone without also handing them the landing pages.
 *
 * `ALTER TYPE ... ADD VALUE` inside a transaction is allowed on PostgreSQL 12
 * and later as long as the new value is not *used* in the same transaction. It
 * is not — nobody can tick a capability until this has committed.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  ALTER TYPE "public"."enum_roles_capabilities" ADD VALUE 'posts:write' BEFORE 'users:manage';
  ALTER TYPE "public"."enum_roles_capabilities" ADD VALUE 'posts:publish' BEFORE 'users:manage';
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"excerpt" varchar,
  	"cover_id" integer,
  	"body" jsonb,
  	"published_at" timestamp(3) with time zone,
  	"author" varchar,
  	"status" "enum_posts_status" DEFAULT 'draft',
  	"noindex" boolean DEFAULT false,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "posts_id" integer;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_cover_idx" ON "posts" USING btree ("cover_id");
  CREATE INDEX "posts_published_at_idx" ON "posts" USING btree ("published_at");
  CREATE INDEX "posts_status_idx" ON "posts" USING btree ("status");
  CREATE INDEX "posts_updated_by_idx" ON "posts" USING btree ("updated_by_id");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");`)

  /**
   * One article to start with, as a **draft**.
   *
   * A blog whose index says "nothing published yet" on launch day is a worse
   * first impression than no blog, and an empty editor is where writing stops
   * before it starts. This is a real piece with every formatting feature in it,
   * so it doubles as the worked example.
   *
   * Draft, not published, deliberately: nothing goes out under someone's name
   * because a migration ran. Read it, make it yours, press Publish — or delete
   * it, since nothing depends on it.
   */
  const existing = await db.execute(sql`SELECT id FROM posts LIMIT 1`)
  if ((existing.rows?.length ?? 0) > 0) {
    payload.logger.info('blog: posts already exist, leaving them alone')
    return
  }

  await db.execute(sql`
    INSERT INTO posts (title, slug, excerpt, body, author, status, noindex, updated_at, created_at)
    VALUES (
      ${FIRST_POST_TITLE},
      'plan-your-q4-in-one-sitting',
      ${FIRST_POST_EXCERPT},
      ${JSON.stringify(FIRST_POST_BODY)}::jsonb,
      'David Love',
      'draft',
      false,
      now(),
      now()
    )
  `)
  payload.logger.info('blog: seeded the first post as a draft')
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "posts" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_posts_fk";
  
  ALTER TABLE "roles_capabilities" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_roles_capabilities";
  CREATE TYPE "public"."enum_roles_capabilities" AS ENUM('pages:read', 'pages:write', 'pages:publish', 'users:manage', 'registrations:read', 'courses:manage', 'media:manage');
  ALTER TABLE "roles_capabilities" ALTER COLUMN "value" SET DATA TYPE "public"."enum_roles_capabilities" USING "value"::"public"."enum_roles_capabilities";
  DROP INDEX "payload_locked_documents_rels_posts_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "posts_id";
  DROP TYPE "public"."enum_posts_status";`)
}
