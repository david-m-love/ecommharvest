# eCommHarvest

> ## Status — 20 August 2026
>
> **Live and in use for the admin and the page builder.** GoHighLevel keeps the
> masterclass funnel: its form, contacts, email and SMS. This app is what David
> controls himself.
>
> - **`/admin`** — login, teammates, permission roles. See **`docs/admin.md`**.
> - **`/builder`** — drag-and-drop page builder with preset blocks built from the
>   existing design system.
> - **`/masterclass`** — serves the *same* block that gets pasted into GHL, read
>   from `ghl/blocks/`. One source, so a proof cannot disagree with what ships.
> - **`ghl/`** — the page designs converted into paste-ready GHL blocks, plus the
>   course outline.
>
> The member area, courses, entitlements and signed video playback are all built
> and tested but **not in use** — GHL handles memberships for now. They stay
> because the hard parts are done: entitlements decoupled from any payment
> provider, signed playback, passwordless auth, an audited admin.
>
> **Deploying needs a Postgres database.** On Vercel: Storage → Create Database →
> Neon Postgres, then add `PAYLOAD_SECRET`. Without them the build fails
> outright, marketing pages included.
>
> Two Vercel-specific gotchas, both now handled but worth knowing:
> - The Neon integration sets `DATABASE_URL`, not `DATABASE_URI`. Add
>   `DATABASE_URI` yourself with the **pooled** connection string.
> - The Framework Preset must be **Next.js**. Set to "Other" the build succeeds
>   and every URL returns Vercel's own 404.

Marketing site, member area, and admin for eCommHarvest — one Next.js app with
Payload CMS running inside it.

| URL | What |
| --- | --- |
| `/` | Marketing home |
| `/masterclass` | Q4 Masterclass landing page (Thursday, September 3, 11:00 AM MT) |
| `/register` | Placeholder — funnel step 2 is GHL's form |
| `/admin` | Admin: login, people, permission roles, page records |
| `/builder` | **Page builder** — drag and drop, preset blocks |
| `/p/[slug]` | A page built in the builder |
| `/learn` | Member area — courses, lessons, progress (built, not in use) |
| `/members` | Access management: grant/revoke, impersonate |
| `/privacy`, `/terms` | Legal pages (**drafts, need legal review**) |

Paths rather than subdomains on purpose: a separate `admin.` host means a
separate cookie scope, so you either duplicate auth or widen the session cookie
to every subdomain. `app.ecommharvest.com` can later be an alias to the same
deployment.

## Stack

- **Next.js 16** (App Router) + React 19, TypeScript
- **Payload CMS 3** — admin panel, auth, and REST/GraphQL inside the same app
- **Puck** (`@measured/puck`, MIT) — the drag-and-drop page builder. Blocks are
  our own React components, so the design system *is* the block library. Why it
  beat GrapesJS and Craft.js here: `docs/admin.md`.
- **Postgres** (Neon in production; a local cluster for development)
- **Cloudflare Stream** for video, behind an adapter so Bunny/Mux is a swap
- **Resend** for transactional email (optional; dev logs links to the console)

## Getting started

```bash
npm install
cp .env.example .env      # fill in DATABASE_URI and PAYLOAD_SECRET
npm run db:start          # local Postgres (skip if using a hosted database)
npm run seed              # admin + test member + the Q4 course
npm run dev               # http://localhost:3000
```

Seeded accounts (development only — override with `SEED_ADMIN_PASSWORD`):

| Email | Role | Password |
| --- | --- | --- |
| `david@lovemarketing.digital` | admin + member | `change-me-locally-8f2a` |
| `member@example.com` | member | `change-me-locally-8f2a` |
| `teammate@example.com` | member + **Page editor** role | `change-me-locally-8f2a` |

The teammate exists to make the permission system visible: they can build pages
and cannot publish them. `npm run test:builder` asserts exactly that.

Members normally sign in without a password: `/login` emails a one-time link. In
development the link is printed to the server console, because Payload's fallback
email adapter logs only the subject.

## Tests

```bash
npm test                  # registration + video adapter, no network or database
npm run ghl:verify        # the GHL blocks are safe to paste (needs Chromium)

# these three need `npm run dev` running against a seeded database:
npm run test:security     # access boundaries
npm run test:builder      # admin, roles, and the page builder over HTTP
npm run test:builder:ui   # the builder driven in a real browser
```

**`npm run dev` cannot catch everything.** Two real failures here were invisible
in dev and broke production: Payload's admin stylesheet is a production-only
import, and the schema is only pushed automatically in dev. Before trusting a
deploy, run `vercel-build` and `next start` against an empty database — the
recipe is in `docs/admin.md`.

If your Chromium does not match the version Playwright expects (common in CI
images and sandboxes), point at it:

```bash
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome npm run test:security
```

`test/security.e2e.mjs` sets an `Origin` header on every request deliberately.
Payload only honours cookie auth for origins listed in `csrf`, so without one
every call reads as unauthenticated and the suite passes for the wrong reason.

## How permissions work

Two layers, kept separate:

- `roles` on a user is identity — `admin` or `member`.
- A **Role** record is a named bundle of capabilities, created from the admin
  panel. So a new job title is data, not a deploy.

Admins short-circuit every check, as a rule rather than as stored data, so a new
feature can never lock the owner out. `users:manage` can assign any custom role
but cannot mint an admin — see `src/lib/capabilities.ts` and `docs/admin.md`.

## How access works

`Entitlements` is the single source of truth for "may this person watch this
course", and it is deliberately decoupled from any payment provider — a manual
grant, a Stripe webhook, and a Shopify order all just write a row. That is why
access works today with no checkout, and why processors stay swappable.

An entitlement counts only if `revokedAt` is empty and `expiresAt` is absent or
in the future. Revoking stamps `revokedAt` rather than deleting, so history
survives a refund dispute.

Course and lesson *metadata* are publicly readable on purpose — that listing is
the sales page. What is gated is **playback**: the player fetches a signed,
four-hour token from `/api/playback/[lessonSlug]`, which authorises before it
reveals anything about the video. Uploads are created with `requireSignedURLs`,
so an unsigned URL never works.

Lessons flagged `isPreview` are playable without an entitlement, as the teaser.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URI` | **yes** | Postgres connection string |
| `PAYLOAD_SECRET` | **yes** | Signs auth tokens. A long random string. |
| `NEXT_PUBLIC_SERVER_URL` | **yes** | Public origin; also a trusted CSRF origin |
| `CLOUDFLARE_ACCOUNT_ID` | video | Cloudflare account |
| `CLOUDFLARE_STREAM_TOKEN` | video | API token with Stream read/write |
| `CLOUDFLARE_STREAM_SIGNING_KEY_ID` | — | Signs playback tokens locally, avoiding an API call per play |
| `CLOUDFLARE_STREAM_SIGNING_KEY_JWK` | — | The signing key, base64 or raw JSON |
| `RESEND_API_KEY` | email | Sends sign-in links. Without it, dev logs them. |
| `BLOB_READ_WRITE_TOKEN` | uploads | Vercel Blob. Required in production — Vercel's filesystem is ephemeral. |
| `KLAVIYO_PRIVATE_KEY` / `KLAVIYO_LIST_ID` | — | Subscribe masterclass registrants to a list |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | — | Extra registration sink + per-IP rate limiting |
| `REGISTRATION_WEBHOOK_URL` | — | Extra registration sink (Zapier, Make, n8n) |
| `ADMIN_TOKEN` | — | Bearer token for scripting the CSV export |

Registrations write to **every** configured sink and the endpoint returns 503 if
none are, so a lead is never accepted into a void. The database counts as a sink,
so once `DATABASE_URI` is set the form works.

Export registrations:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://<site>/api/registrations > regs.csv
```

## Deploy

Vercel runs `npm run vercel-build` — `payload migrate && next build` — so **the
schema is created and updated by the deploy itself**. Nothing to run by hand.
`build` stays plain `next build`, so a local build never touches a database.

Checklist for a new project:

1. Framework Preset **Next.js**. Left on "Other", the build succeeds and every
   URL returns Vercel's own 404.
2. Storage → Create Database → **Neon Postgres**. The integration sets
   `DATABASE_URL`; this app reads **`DATABASE_URI`**, so add that too, with the
   pooled connection string.
3. `PAYLOAD_SECRET` — any long random string.
4. Deploy, then open `/admin` and create the first user. It becomes an admin
   automatically; see `docs/admin.md`.

`next.config.mjs` carries the headers and the legacy `.html` redirects; there is
no `vercel.json`.

Add every domain you sign in on to `csrf` in `src/payload.config.ts`, including
preview URLs, or cookie auth will silently not work there. `VERCEL_URL`,
`VERCEL_BRANCH_URL` and `VERCEL_PROJECT_PRODUCTION_URL` are picked up
automatically.

### After changing a collection

```bash
npm run migrate:create some-name    # then commit src/migrations/
```

Skip it and the next deploy builds fine, then fails at runtime on a missing
column.

## Open items

1. **Legal review.** `/privacy` and `/terms` are drafts and say so on the page.
   Bracketed placeholders for entity name, address, contact addresses, retention
   period, liability cap, and governing law. One real decision inside: whether
   the three host brands receive registrant details — pick one branch, delete the
   other, and make it match what you actually do.
2. **Klaviyo schema unverified.** The subscribe call is pinned to API revision
   `2024-10-15` but was written without access to live docs. Send one test
   registration and confirm the profile lands on the list.
3. **Host logos** — three monogram placeholders. See `docs/logos.md`.
4. **Speaker photos and bios** — `DL` / `DC` monograms; both bios are drafts.
   Confirm Derek's with him.
5. **No payments yet.** Access is granted by hand from `/members`. Stripe
   Checkout plus a webhook that calls `grantAccess()` is the next step.
6. **No webinar platform integration.** Nothing here issues a Zoom/Demio join
   link; the confirmation email must carry it. If registrants need pushing into
   the platform, that is a fifth sink in `src/lib/registration.ts`.
7. **Analytics / ad pixel** — none installed. When a Meta pixel goes on, the
   privacy policy's tracking section must name it, and it should be consent-gated
   for UK/EU visitors.

## Notes for whoever works on this next

- **Next 16 renames `middleware` to `proxy`**, with no edge runtime. `AGENTS.md`
  is generated by `next dev` and committed deliberately, since it is recreated
  on every run.
- **Payload scripts need top-level `await`.** A floating promise lets Node exit 0
  before the database connects, so a seed appears to succeed while doing nothing.
- **Postgres ids are integers.** `numericId()` in `src/lib/entitlements.ts`
  coerces ids arriving as strings from URL params.
- **Impersonation replaces your own session** rather than stacking one, so you
  sign back in afterwards. Deliberate: carrying the original identity in a second
  cookie is a much larger security surface than a second sign-in is an
  inconvenience.
