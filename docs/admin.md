# The admin at /admin

Login, people, permissions, and a drag-and-drop page builder.

## What exists

| URL | What | Who |
| --- | --- | --- |
| `/admin` | Login, then the admin panel | anyone with a permission |
| `/admin/collections/pages` | Page records — name, URL, search description | `pages:read` or `pages:write` |
| `/admin/collections/users` | People | admins, or `users:manage` |
| `/admin/collections/roles` | Permission bundles | admins only |
| `/builder` | The page list, and **New page** | `pages:write` |
| `/builder/[id]` | The drag-and-drop canvas | `pages:write` |
| `/p/[slug]` | A page you built, live | public once published |

`/admin` is Payload's panel and `/builder` is the canvas. They are separate
routes because the canvas needs the whole window — squeezed beside the admin
sidebar it is unusable. There is a **Page builder** link in the admin sidebar, so
it reads as one place.

## Deploying, and the first sign-in

Schema changes ship as **migrations** in `src/migrations`, never as an automatic
push against a live database — a push can drop a column to match a rename.

Vercel runs `npm run vercel-build`, which is `payload migrate && next build`. So
**a deploy creates or updates the schema by itself**; there is nothing to run by
hand and no local Postgres needed. If a migration fails the build fails, which is
correct — better than a deployment that serves a broken app.

After changing a collection:

```bash
npm run migrate:create some-name   # writes src/migrations/<timestamp>_some-name.ts
git add src/migrations && git commit
```

Skip that and the next deploy builds fine, then fails at runtime on a missing
column. `npm run migrate:status` lists what has run.

### The first admin

Visit `/admin` on a fresh database and Payload shows a **create-first-user**
screen. Fill in email and password; that account is made an **admin
automatically**.

That last part is deliberate and load-bearing. The screen shows `Roles`
pre-filled with `Member` and labelled "only admins can change this" — leave it
alone and you would create a member, land on "unauthorized", and be locked out
for good, because the create-first-user route disappears the moment a user
exists. `src/lib/first-user.ts` forces the first account to be an admin so that
dead end cannot happen. Every later account still defaults to member.

Verified on a genuinely empty database with `next start`, not `next dev` — see
"Why production is tested separately" below.

## Signing in

Email and password, at `/admin`. Ten wrong attempts locks the account for ten
minutes.

Members of the course area sign in differently — `/login` emails them a one-time
link, no password. Same person, same account, both work.

## Roles, and why they are not just "admin" and "member"

Two different ideas, deliberately kept apart:

- **`roles`** on a person is *identity*: admin, or member. Coarse, rarely changes.
- **A Role record** is a named bundle of *permissions* — "Copywriter",
  "Bookkeeper", "VA". Create it once, tick what it may do, hand it to as many
  people as you like.

The point of the second one: a new job title is a row in the database, made from
the admin panel, with no code and no deploy. Adding a brand-new *kind* of
permission is a code change, because something has to enforce it. Composing
existing ones is not.

**Admins bypass all of it and always have every permission.** That is a rule, not
stored data — so a new feature can never accidentally lock you out of your own
site.

### The permissions

| Permission | Lets someone |
| --- | --- |
| `pages:read` | See pages in the builder |
| `pages:write` | Create and edit pages |
| `pages:publish` | Make pages live |
| `users:manage` | Invite people, edit them, assign roles |
| `registrations:read` | See and export masterclass registrants |
| `courses:manage` | Create and edit courses, modules, lessons |
| `media:manage` | Upload and manage media |

Two starter roles are seeded: **Page editor** (build but not publish) and
**Publisher** (build and publish). They are the two shapes almost every small
team needs first.

### The boundary that matters

`users:manage` can hand out any custom role but **cannot make someone an admin** —
that still takes an admin. Without that split, `users:manage` would be a
one-step path to full control of the site. It is asserted in
`test/builder.e2e.mjs`, not assumed.

Likewise `pages:write` and `pages:publish` are separate: a contractor can build
all day and an admin decides what goes live. A publish attempt without the
permission is **refused with an explanation**, never silently saved as a draft —
someone told "saved" would believe their page was live.

Changing or removing a role takes effect on that person's **next request**. They
do not need to sign out. Payload re-reads the user from the database on every
request, so permissions are never cached in a token.

## Adding a teammate

1. `/admin` → **Roles** → create one, or use Page editor / Publisher.
2. **Users** → **Create new**. Email, password, leave `roles` as Member.
3. Set **Permissions** to the role you made.
4. Send them the address and the password. They land in the admin and see only
   what their role allows.

Do **not** give a teammate `admin` unless you mean "can do absolutely anything,
including deleting people and changing my permissions".

## The page builder

`/builder` → **New page** → the canvas opens on a working page: hero, hosted-by
bar, CTA card, footer. Edited down, not filled in from nothing — a blank builder
is where people give up.

Drag a block from the left. Click anything on the canvas to edit its fields on
the right. **Save draft** whenever; **Publish** when it should be live.

### The blocks

| Block | For |
| --- | --- |
| Hero | Badge, headline, sub-headline, lead paragraph, date line, button |
| Hosted-by bar | Partner brands — initials, or a logo URL |
| Dark feature card | The navy "faith first" style card |
| Bullet list | The "what you'll learn" list, with an optional button |
| Formula bar | `Ads × Offer × Repeat = the CAC you can afford` |
| Row of cards | Two to four cards |
| Speakers | People with initials, title and bio |
| Heading and text | Anything else, on brand |
| Call to action card | The dark card with one button |
| Footer | Copyright, links, a note |

**Blocks cannot go off-brand.** They have no colours, fonts or sizes of their own
— every one renders with the classes in `src/styles/design-system.css`, the same
stylesheet as the masterclass page. What you edit is text, links, and how many
items are in a list. That is the constraint that keeps a page builder from
producing something that looks nothing like the rest of the site.

Every block arrives carrying real copy rather than empty boxes.

### Linking out to GoHighLevel

Any button's link field takes a full URL, so point it straight at a funnel step:
`https://ecommharvest.com/register`. Pages built here are for the parts you want
to control; GHL keeps the forms, contacts and workflows.

### Renaming a page, and its URL

The canvas edits layout. Name, URL slug, search description and the noindex flag
live on the record — the **Name & URL** button in the canvas header goes there.
Two inputs for one value would eventually disagree, so there is only one.

New pages are created with **noindex on**. Turn it off when a page is genuinely
ready to be found.

### Drafts

A draft 404s for the public and renders for your team with a "Draft preview" bar
across the top. A 404 rather than a 403 on purpose: a 403 confirms the page
exists, which leaks an unannounced launch to anyone guessing URLs.

## Why Puck, and not the alternatives

[Puck](https://github.com/measuredco/puck) (`@measured/puck`, MIT, 0.20.2). The
reasons, in order:

1. **Blocks are your own React components.** So the existing design system *is*
   the block library. Nothing was redrawn.
2. **It ships a working editor UI.** GrapesJS makes you build the interface
   yourself.
3. **Output is JSON you own**, stored in your database. No SaaS, no lock-in, and
   a published page renders server-side — the editor's bundle never reaches a
   visitor.

Considered and rejected:

- **[GrapesJS](https://github.com/GrapesJS/grapesjs)** (BSD-3, very actively
  maintained, 100+ plugins) is the more powerful tool, and it is shaped around
  free-form HTML/CSS editing. That is the opposite of "presets that stay on
  brand", and you would be building its whole UI. Worth revisiting if you ever
  want genuinely unconstrained editing.
- **[Craft.js](https://github.com/prevwong/craft.js)** (MIT) is a toolkit for
  *building* an editor, so it is more work for less. Last published February
  2025 and still 0.2.x.
- **Builder.io / Plasmic** are commercial SaaS. Same lock-in you just left.

## Security

- Admin and builder routes send `X-Frame-Options: DENY` and
  `frame-ancestors 'none'`. Clickjacking a signed-in admin session is the attack
  that closes.
- Cookie auth is only honoured for origins listed in `csrf` in
  `src/payload.config.ts`. **Add every domain you sign in on**, including Vercel
  preview URLs, or login will silently not work there.
- Every save runs the collection's access rules as well as the route's own check
  — two independent gates.
- `updatedBy` is stamped server-side, so it cannot be forged.
- A layout of the wrong shape is rejected before it reaches the database. A page
  that cannot render is worse than a refused save.

### Known advisories

`npm audit` reports two, both examined rather than ignored:

- **esbuild** — dev-server only, no fix published. Not shipped to production.
- **uuid** — the flaw is in `v3`/`v5`/`v6` when a `buf` argument is passed. Puck
  imports only `v4`. Not exploitable here; the "fix" npm offers would downgrade
  Puck by seven minor versions.

The four **dompurify** advisories were real and are fixed, via an `overrides`
entry in `package.json` — it arrives under Payload's admin UI through
monaco-editor, which pins an old version.

## Why production is tested separately

Two failures on this project were invisible in `npm run dev` and broke the
deployed app:

1. **The admin panel had no styling.** Payload's compiled stylesheet — the theme
   variables, fonts and reset — ships as a production-only file that must be
   imported as `@payloadcms/next/css`. `next dev` compiles the SCSS itself, so
   the admin looks perfect locally while a real deployment renders unstyled Times
   New Roman, on a build that succeeded. Now imported in
   `src/app/(payload)/layout.tsx`.
2. **The schema was never created.** Dev pushes it automatically; production does
   not. Hence migrations, and hence `vercel-build`.

So before trusting a deploy:

```bash
createdb something_empty
DATABASE_URI=postgres://…/something_empty npm run vercel-build   # migrate + build
DATABASE_URI=postgres://…/something_empty npx next start -p 3002
# then open http://localhost:3002/admin and create the first user
```

If the login screen shows the Payload logo and a dark **Login** button, the
stylesheet is loading. Serif text on a white page means it is not.

## Tests

```bash
npm run dev                                  # in another terminal, seeded
npm run test:builder                         # 51 checks, HTTP
npm run test:builder:ui                      # 30 checks, real browser
```

`test/builder.e2e.mjs` covers permissions and the API. `test/builder.ui.mjs`
drives the actual editor, and it earns its keep: it caught a bug nothing else
could see. Puck merges a block's `defaultProps` when it *renders* in the editor
but not into the state it *saves*, so starter blocks written as
`{ type, props: { id } }` looked perfect on the canvas and published a page with
no words on it.

Every request in both suites sets an `Origin` header deliberately. Payload only
honours cookie auth for listed origins, so without one every call reads as
unauthenticated and both suites would pass for the wrong reason.
