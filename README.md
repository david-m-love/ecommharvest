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

## Domains

Three hostnames, two platforms. DNS points a *hostname*, not a path — so a
single domain cannot be split across two providers, which is why this is a
subdomain split rather than a path split.

| Hostname | Platform | What lives there |
| --- | --- | --- |
| `ecommharvest.com` | **Vercel** (this app) | The public site and published builder pages |
| `app.ecommharvest.com` | **Vercel** (same deployment) | `/admin`, `/builder`, `/learn`, `/members` |
| `go.ecommharvest.com` | **GoHighLevel** | Funnels, forms, contacts, email and SMS |

Both Vercel hostnames are added to the same project, so every route is
technically reachable on both. `next.config.mjs` redirects the private areas from
the site host to `app.`, so each address means one thing. That is tidiness, not
security — the security boundary is authentication, which does not care which
hostname you arrived on.

**The auth cookie is deliberately host-scoped**, not set on `.ecommharvest.com`.
A wildcard cookie would be sent to *every* subdomain — including
`go.ecommharvest.com`, which is GoHighLevel's servers. Sending an admin session
to a third-party platform is not a trade worth making for the convenience of one
login across both hosts. Practical consequence: sign in at `app.`, and preview
unpublished pages at `app.ecommharvest.com/p/<slug>` rather than on the site host,
where you are not logged in and a draft correctly 404s.

`go.ecommharvest.com` is **not** in the `csrf` list, on purpose. Nothing there
needs to call this app's authenticated API, and listing it would let a
GoHighLevel-hosted page do so.

| URL | What |
| --- | --- |
| `/` | Marketing home — **editable in the page builder** |
| `/masterclass` | Q4 Masterclass landing page — **editable in the page builder** |
| `/register` | Placeholder — funnel step 2 is GHL's form |
| `/admin` | Admin: login, people, roles, page records, **Site Styles**, Media |
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

## When `/admin` is a blank white page

Go to **`/status`**. It says in plain English what is wrong and what to do about
it — no login needed, which is the point, because a blank admin is exactly when
you cannot log in.

The reason that page exists: when the app cannot reach its database, `/admin`
returns a 500 and browsers render a 500 as *nothing at all*, while the public
pages carry on working from their built-in fallback copy. The site therefore
looks healthy and the admin looks broken, which points at the admin — the one
place the problem is not. `/status` opens its own database connection with a
short timeout, so it answers even when Payload cannot start, and it reports
whether each setting is present, never its value.

## Tests

```bash
npm test                  # registration + video adapter, no network or database
npm run ghl:verify        # the GHL blocks are safe to paste (needs Chromium)

# these three need `npm run dev` running against a seeded database:
npm run test:security     # access boundaries
npm run test:builder      # admin, roles, and the page builder over HTTP
npm run test:builder:ui   # the builder driven in a real browser
npm run test:styles       # brand colours, logo upload, / and /masterclass

# reads the build output, so it needs a build rather than a dev server:
npm run build && npm run test:prerender   # no page is frozen at deploy time
```

**`npm run dev` cannot catch everything.** Three real failures here were
invisible in dev and broke production: Payload's admin stylesheet is a
production-only import, the schema is only pushed automatically in dev, and
`next build` prerendered `/` and `/masterclass` into static HTML — so
republishing a page in the builder changed the database and nothing a visitor
saw. Dev renders every request fresh, which hides all three. Before trusting a
deploy, run `vercel-build` and `next start` against an empty database — the
recipe is in `docs/admin.md` — and run `test:prerender` after the build.

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
4. `NEXT_PUBLIC_SERVER_URL=https://app.ecommharvest.com` — the host people sign
   in on, so emailed sign-in links are absolute and correct.
5. Settings → Domains → add **both** `ecommharvest.com` and
   `app.ecommharvest.com`. Vercel shows the exact DNS record to create; copy it
   from there rather than from memory, since the values differ by account.
6. Deploy, then open `app.ecommharvest.com/admin` and create the first user. It
   becomes an admin automatically; see `docs/admin.md`.

`SITE_HOST` and `APP_HOST` override the redirect hostnames if the domains ever
change. Bare hostnames only — Next strips the port before matching, so
`localhost:3000` matches nothing.

### Moving GoHighLevel to `go.`

Do it in this order, or the masterclass page goes dark mid-flight:

1. In GHL, add `go.ecommharvest.com` to the funnel and confirm the page loads
   there, **while `ecommharvest.com` still points at GHL**.
2. Only then re-point `ecommharvest.com` at Vercel.
3. Rebuild the GHL blocks if step 2's path is not `register`:
   `REGISTER_URL=https://go.ecommharvest.com/<path> npm run ghl:build`

The blocks' links are absolute (`https://go.…/register` for the CTAs,
`https://ecommharvest.com/privacy` for the legal links) precisely because the
same block is served from two hosts. Root-relative links would have meant two
different things — and the footer's privacy link would have 404'd on `go.`, on
the page that must carry a working privacy link before any Meta ad runs.

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
