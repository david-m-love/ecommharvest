import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The private member community — Phase 1.
 *
 * Two new tables (`threads`, `replies`), a byline on `users`, and the change
 * that makes a membership representable at all: `entitlements.course_id` stops
 * being NOT NULL and a `product` column appears beside it. An entitlement now
 * points at a course *or* a subscription, which is what lets one table keep one
 * revocation story instead of growing a second table with its own.
 *
 * Nothing here grants anybody anything. Access is still given by hand on
 * /members until the payment webhook lands in Phase 2; this only makes the
 * shape it will write into exist.
 *
 * The `ALTER TYPE ... ADD VALUE` for the new capability is safe inside this
 * transaction on Postgres 12 and later — which Neon and the local database both
 * are — because the value is only added here, never used, until a later
 * statement in a later transaction assigns it to a role.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_entitlements_product" AS ENUM('weekly');
  ALTER TYPE "public"."enum_roles_capabilities" ADD VALUE 'community:moderate';
  CREATE TABLE "threads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"body" varchar NOT NULL,
  	"author_id" integer NOT NULL,
  	"pinned" boolean DEFAULT false,
  	"locked_at" timestamp(3) with time zone,
  	"last_reply_at" timestamp(3) with time zone,
  	"reply_count" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "replies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"thread_id" integer NOT NULL,
  	"body" varchar NOT NULL,
  	"author_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "entitlements" ALTER COLUMN "course_id" DROP NOT NULL;
  ALTER TABLE "users" ADD COLUMN "display_name" varchar;
  ALTER TABLE "entitlements" ADD COLUMN "product" "enum_entitlements_product";
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "threads_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "replies_id" integer;
  ALTER TABLE "site_styles" ADD COLUMN "show_weekly_call" boolean DEFAULT false;
  ALTER TABLE "site_styles" ADD COLUMN "weekly_call_url" varchar;
  ALTER TABLE "site_styles" ADD COLUMN "weekly_call_when" varchar;
  ALTER TABLE "site_styles" ADD COLUMN "weekly_call_label" varchar;
  ALTER TABLE "site_styles" ADD COLUMN "weekly_call_thread" varchar;
  ALTER TABLE "threads" ADD CONSTRAINT "threads_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "replies" ADD CONSTRAINT "replies_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "replies" ADD CONSTRAINT "replies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "threads_slug_idx" ON "threads" USING btree ("slug");
  CREATE INDEX "threads_author_idx" ON "threads" USING btree ("author_id");
  CREATE INDEX "threads_pinned_idx" ON "threads" USING btree ("pinned");
  CREATE INDEX "threads_last_reply_at_idx" ON "threads" USING btree ("last_reply_at");
  CREATE INDEX "threads_updated_at_idx" ON "threads" USING btree ("updated_at");
  CREATE INDEX "threads_created_at_idx" ON "threads" USING btree ("created_at");
  CREATE INDEX "replies_thread_idx" ON "replies" USING btree ("thread_id");
  CREATE INDEX "replies_author_idx" ON "replies" USING btree ("author_id");
  CREATE INDEX "replies_updated_at_idx" ON "replies" USING btree ("updated_at");
  CREATE INDEX "replies_created_at_idx" ON "replies" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_threads_fk" FOREIGN KEY ("threads_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_replies_fk" FOREIGN KEY ("replies_id") REFERENCES "public"."replies"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "entitlements_product_idx" ON "entitlements" USING btree ("product");
  CREATE INDEX "payload_locked_documents_rels_threads_id_idx" ON "payload_locked_documents_rels" USING btree ("threads_id");
  CREATE INDEX "payload_locked_documents_rels_replies_id_idx" ON "payload_locked_documents_rels" USING btree ("replies_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "threads" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "replies" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "threads" CASCADE;
  DROP TABLE "replies" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_threads_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_replies_fk";
  
  ALTER TABLE "roles_capabilities" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_roles_capabilities";
  CREATE TYPE "public"."enum_roles_capabilities" AS ENUM('pages:read', 'pages:write', 'pages:publish', 'posts:write', 'posts:publish', 'users:manage', 'registrations:read', 'courses:manage', 'media:manage');
  ALTER TABLE "roles_capabilities" ALTER COLUMN "value" SET DATA TYPE "public"."enum_roles_capabilities" USING "value"::"public"."enum_roles_capabilities";
  DROP INDEX "entitlements_product_idx";
  DROP INDEX "payload_locked_documents_rels_threads_id_idx";
  DROP INDEX "payload_locked_documents_rels_replies_id_idx";
  ALTER TABLE "entitlements" ALTER COLUMN "course_id" SET NOT NULL;
  ALTER TABLE "users" DROP COLUMN "display_name";
  ALTER TABLE "entitlements" DROP COLUMN "product";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "threads_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "replies_id";
  ALTER TABLE "site_styles" DROP COLUMN "show_weekly_call";
  ALTER TABLE "site_styles" DROP COLUMN "weekly_call_url";
  ALTER TABLE "site_styles" DROP COLUMN "weekly_call_when";
  ALTER TABLE "site_styles" DROP COLUMN "weekly_call_label";
  ALTER TABLE "site_styles" DROP COLUMN "weekly_call_thread";
  DROP TYPE "public"."enum_entitlements_product";`)
}
