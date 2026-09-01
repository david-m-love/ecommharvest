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
| `/admin/collections/posts` | Blog posts | `posts:write` |
| `/blog`, `/blog/[slug]` | The blog, live | public once published |

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

**`npm run test:schema` is the check for exactly that**, and it is worth running
before any deploy that touched a collection or a global. It builds a database
from the committed migrations alone and asks Payload whether anything in the
config is missing from it — naming the column if so.

This has bitten twice, and it is worth understanding why it is so easy to miss.
Locally Payload runs with `push` on, so adding a field silently alters your
database to match: everything works, and nothing is missing until production —
which only runs migrations — asks for a column that was never created. Payload
selects every column a table declares, so **one missing column breaks every read
of that table**, and the symptoms never mention a column. The second time, the
site logo turned into plain text on every page and the Site Styles screen
answered "Nothing found" — because the front end catches the failure and quietly
falls back to its defaults.

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
| `posts:write` | Write and edit blog posts |
| `posts:publish` | Make blog posts live |

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

## Managing pages

The list at `/builder` has, per page: **Edit**, **View** (or **Preview** for a
draft, since a draft has no public page), **Rename & settings**, **Duplicate** and
**Delete**.

Two rules worth knowing, both enforced on the server rather than only hidden in
the interface:

- **A duplicate is always a draft**, whatever the original was. Publishing is a
  decision, and "duplicate" should never be the thing that puts a second copy of
  a live page on the internet. It opens straight into the canvas, because the
  point of duplicating is to change something.
- **The site's own pages cannot be deleted** — `/`, `/masterclass`, `/privacy`
  and `/terms` are rendered by routes, so deleting one takes a URL off the
  internet rather than tidying a list. They can be duplicated and unpublished.
  Deleting a *published* page needs permission to publish, because it is the same
  act in reverse.

**Unsaved work survives a closed laptop.** The canvas is kept in your browser as
you type, and reopening the page offers to restore it. Offered, never applied:
the local copy might be older than what someone else published. It is per browser
and never sent anywhere — autosaving to the database would mean every keystroke
on a live page could become the live page.

**The editor works on a phone**, with its own layout — see "On a phone" under
the page builder below.

## Advertising and measurement

**Page views** are counted by Vercel Analytics — no cookies, no cross-site
identifiers, nothing that needs a consent banner. Turn it on once in Vercel:
project → **Analytics** → Enable. Nothing to deploy.

**The Meta pixel** is a field in Site Styles → *Advertising and measurement*.
Paste the ID from Events Manager and it starts working; clear the field and no
tracking script reaches the page at all. That switch is the honest default for a
site that is not advertising.

How it loads is not a free choice, because the privacy policy describes it:

- A browser sending **Global Privacy Control** or **Do Not Track** is honoured
  everywhere, with no banner and no exceptions.
- In the **UK, EEA and Switzerland** a small bar asks first, and nothing is
  requested from Meta until the visitor accepts. The answer is remembered in
  `localStorage`, not a cookie — a cookie to record "do not track me" is a small
  absurdity.
- **Elsewhere** it loads, with opt-out routes named in the policy.

`npm run test:tracking` checks all four paths by watching the network, so a
change that quietly starts loading the pixel earlier will fail.

## The menu

**Site Styles → Menu links.** Up to six, each with a label and a destination, and
one of them can be marked "show as a button" — for the link that takes a booking.
Set once, shown on every page.

Each page then decides *whether* to show it: the Header block has a Menu setting
with "Show the site menu" and "Hide it (best for a landing page)". That split is
deliberate. A landing page whose only job is one button converts better without a
menu offering five ways to leave; an ordinary page reads as broken without one.
The links live in one place, and the page chooses.

Ships empty, because this site is a landing page today. Add links when there is
more than one page worth visiting.

On a phone the menu collapses behind a button and the logo moves to the middle of
the bar.

## The logo, and why there is only one

The logo is **one image in one place**: Site Styles. Its size is set there too,
by name — Small, Medium, Large, Extra large — and both apply to every page that
has a Header block. There is no per-page logo and no per-page size.

That is a correction, not a limitation. The Header block used to carry its own
logo picker while the *size* came from Site Styles, which made the logo neither
global nor local: changing the size appeared to do nothing on pages that had
picked their own image, dragging a header onto a new page produced a different
logo again, and no one could say what either control would do. One logo, one
size, four sizes to choose from.

Sizes are names rather than a number for the same reason there are no padding
controls: 31/41/55/72px all look deliberate, and a box that accepts 200 wrecks a
sticky header. Tall logos are capped on phones so a desktop choice cannot eat a
small screen.

## Site Styles — the logo and the colours

`/admin` → **Site** → **Site Styles**. One screen, and it applies to every page.

- **Logo** — pick an image, or upload one. Shown top-left on any page with a
  Header block. Leave it empty and the site name shows as text instead.
- **Seven brand colours**, prepopulated with the real palette and labelled by
  what they actually affect ("Buttons, the × in the formula bar, highlights"),
  not by internal names.

Change the accent here and every button, chip and eyebrow on every page follows,
with no deploy and nothing per-section to touch.

### Why there are no per-section colour controls

This is the Squarespace split, on purpose: **global** things (logo, colours) live
in Site Styles; **local** things (words, links, how many cards) are edited per
block. What is deliberately absent is per-section colour, padding, spacing and
corner radius.

Those are the controls that let a page drift off-brand, and they are the reason
DIY pages end up looking like a different site. Every block renders from the same
stylesheet and has no colours of its own to get wrong, which is what makes a page
built in five minutes still look like the rest of the site.

Adding them later is possible but is a real change of direction, not a setting —
it means giving every block its own style props and accepting that pages can
disagree with each other.

### How the colours actually reach the page

`src/styles/design-system.css` defines the palette as CSS custom properties on
`:root`. Site Styles emits a second `:root` block after it with only the changed
values, so the override is global, instant and costs a few hundred bytes. That
is the whole reason "editable colours" is easy globally and messy per section:
the design system was built on variables from the start.

Hex values are validated twice — in the admin form, and again before they are
interpolated into the `<style>` tag, so a pasted value cannot inject CSS.

## Uploading logos and images

You do not have to go to the admin for this. Every image field in the builder has
**Upload an image**, which puts the file in the Media library *and* in the slot
you are filling, in one action. **Choose from library** picks one you already
have. The library is also at `/admin` → **Site** → **Media** if you would rather
work there.

The fields that take an image are the logo on each brand in the hosted-by bar and
each speaker's photo. The site logo is not one of them — it is set once in Site
Styles and appears on every page (see above).

Speakers and hosts fall back to initials when no image is chosen, so a page never
shows an empty circle.

**Images are resized for the device.** A 2000px logo is not sent to a phone to be
shown at 41px; a version scaled for the screen is served instead, in a modern
format, from a cache. This happens because the builder records the file's real
pixel dimensions when you choose it, which also lets the browser hold the right
amount of space from the first paint — before, the header grew as the logo
arrived and shoved the page down. Images chosen before this existed have no
recorded dimensions and are served as-is; re-pick one in its field to fix that.

**A file still in use cannot be deleted.** Blocks store an image's address, not a
link to the library record, so nothing in the database connects the two — a
delete used to leave a live page pointing at a file that no longer existed, with
no warning. Now the delete is refused and the message names what is using it: the
pages, a course cover, a lesson attachment, or the site logo. Change the image in
those places first, then delete the file.

**On Vercel this needs a Blob store.** Vercel's filesystem is ephemeral, so
without one a file uploads fine, shows a working thumbnail, and disappears on the
next deploy — leaving broken images on every page that used it. Rather than let
that happen silently, uploads are **refused** with the fix in the message:
Storage → Create Database → Blob, connect it, redeploy.

## The funnel

Registration and the thank-you page are **on this site** now, at `/register` and
`/masterclass/thanks`. They were GoHighLevel pages on `go.ecommharvest.com`, with
our HTML pasted above and below GHL's form.

**We own the page, GHL owns the form.** Everything a visitor reads is a
page-builder page — editable in the builder, on a phone, with no paste step. The
form itself is a **Registration form** block: an embedded GHL form, so the
contact record, the workflows and the email and SMS all still live in GHL, which
is the reason it is there at all. Rebuilding the form here would mean a second
place for leads to land and a second consent record to reconcile.

What that buys: one domain for the whole funnel, so analytics is one funnel
rather than two sites — and no hop to a differently-branded site in the middle of
registering, which is where people leave.

### Two settings in GoHighLevel

Neither can be set from here.

1. **Where the form redirects.** The form's *On submit* must point at
   `https://ecommharvest.com/masterclass/thanks`. Until it does, people submit
   and land back on GHL's own thank-you step.
2. **The form's name.** It is currently "Masterclass Registration 9/3/2026" — an
   internal label with a date that has moved. It is worth renaming, though the
   block overrides what a screen reader announces so no visitor sees it.

### Changing the form

The **Registration form** block takes a form ID — the last part of the embed code
GHL gives you, `.../widget/form/<this>`. Paste a new one into the block to swap
forms on one page without a deploy; `MASTERCLASS_FORM_ID` in `src/lib/event.ts`
is the default new blocks start with.

The block reserves space before the form loads (*Space to reserve*). GHL's script
sets the real height once the form reports it; the reservation is what stops the
page looking broken on a slow connection.

## Moving the masterclass date

The date lives in three kinds of place, and only one of them is code.

**1. Edit `src/lib/event.ts`.** The times, the wording, and the day name are all
there. Everything machine-readable derives from it: the calendar file at
`/masterclass.ics`, the Event structured data Google reads, and the defaults on
new blocks.

**2. Run `npm run ghl:build`.** The GoHighLevel blocks are built from
`ghl/src/*.html`, and those are pasted by hand — nothing can reach into GHL from
here. Re-paste the two that carry the date: the registration page's block above
the form, and the thank-you page.

**3. Write a migration for the live pages.** `/` and `/masterclass` are
page-builder pages, so their words are in the database and changing the code does
not change what is on the site.
`src/migrations/20260830_010000_masterclass_date.ts` is the worked example: a
targeted find-and-replace on the stored JSON, which leaves any other editing
alone and is a no-op if the date was already changed by hand in the builder.

Then `npm test` — `test/event.test.ts` fails and names the file if anything
still says the old date. It also checks the UTC times match the local ones, and
that the day name matches the date.

### MT, not MST or MDT

Write **MT**. The mountain states are on MDT (UTC−6) from March to November and
MST (UTC−7) the rest of the year, so "MST" on a September date is an hour wrong,
and "MDT" reads as jargon and invites the question it was meant to settle. MT is
right all year. The bracket — *(1:00 PM ET / 10:00 AM PT)* — is what actually
stops half the audience doing arithmetic.

### Two things that keep their old date on purpose

- **The calendar entry's UID.** It identifies the invitation already sitting in
  someone's calendar. Keeping it, and raising `EVENT_SEQUENCE`, is what makes a
  moved time *correct* that entry instead of adding a second one beside it.
- **The registration tag** (`q4-masterclass-2026-09-03`). It is how the audience
  is segmented; renaming it would split people who signed up before the move from
  those who signed up after, for one event.

## The blog

`/admin` → **Site** → **Posts** → **Create new**. Articles live at **`/blog`**.

### Why /blog, and not /news or /insights

The address is what readers and search engines expect, and it is the most
linkable path there is — people search "ecommerce blog", nobody searches
"ecommerce insights". "News" would be wrong for evergreen writing: a piece about
Q4 offers is as useful next August as it is today, and filing it under news dates
it on arrival.

What it is **called** is a separate question, and yours: Site Styles → **The
blog** sets the heading and the line under it. Call it Field Notes, The Playbook,
anything. The address stays `/blog`.

### Why posts are not built in the page builder

The builder is for *pages*, where the arrangement of sections is the work. An
article is the opposite — one column of prose where the writing is the work and
the layout should never vary. So a post is written in a normal editor, and every
article on the site comes out laid out identically. Nobody has to think about
design to publish one.

### The fields

| Field | What it is for |
| --- | --- |
| **Title** | The headline. Also what Google and a shared link show. |
| **Excerpt** | One or two sentences. It is on the index card, in search results, in the shared-link preview and in the feed — the only thing most people ever read. Worth writing properly. |
| **Cover** | Top of the post, the index card, and the picture when the link is shared. Landscape. |
| **Body** | Headings, **bold**, links, lists, quotes and images. All of it comes out in the site's own styling. |
| **Date** | Sorts the blog and shows on the post. Fills itself in when you publish, and can be set forward or back. |
| **Author** | Optional byline. |
| **Status** | Draft until you publish. A draft 404s for the public and shows you a "draft preview" banner. |

### Who can write, and who can publish

Two permissions, separate on purpose: `posts:write` and `posts:publish`. A
freelance writer can be given the first without the second, and without going
anywhere near the page that takes registrations. Assign them in a Role exactly
like the page permissions.

### What comes with it

- **`/blog/rss.xml`** — a feed. It is how another tool finds new posts: an email
  platform turning one into a campaign, a partner listing your articles. Nothing
  else provides it, and it cannot be added retroactively to posts nobody
  subscribed to. Summaries only, so scraper sites cannot republish the article
  whole and outrank you.
- **The sitemap** lists every published post automatically.
- **Structured data** on each post, which is what lets a search result show a
  date and a byline rather than just a title.
- **A "Latest from the blog" block** for the builder, under *Bottom of page*.
  Drop it on the home page and it shows the newest two, three or four. It shows
  nothing at all when there are no posts, rather than a heading over an empty
  space.

### Two things to do once

1. **Put it in the menu.** Site Styles → **Menu links** → add `/blog`. Nothing
   links to it until you do.
2. **Read the post that is already there.** The blog starts with one article,
   saved as a **draft** — a real piece on planning a quarter, with every
   formatting feature in it as a worked example. It is not published: nothing
   goes out under your name because a deploy ran. Edit it, publish it, or delete
   it.

## The page builder

`/builder` → **New page** → the canvas opens on a working page: hero, hosted-by
bar, CTA card, footer. Edited down, not filled in from nothing — a blank builder
is where people give up.

Drag a block from the left. Click anything on the canvas to edit its fields on
the right. **Save draft** whenever; **Publish** when it should be live.

### On a phone

The same editor, laid out for a thumb. There used to be a notice here saying to
come back at a computer; there is not any more.

| To | Do this |
| --- | --- |
| Edit a section | Tap it on the page. Its settings slide up over the page. |
| Finish editing it | **Done** |
| Add a section | **+ Add block**, then tap the one you want. It lands at the bottom of the page with its own settings open. |
| Move a section | Select it, then **↑ Up** / **↓ Down** above its settings — no dragging. |
| Delete a section | Select it, then **Delete**. It asks first. |
| Undo | The **↶** arrow, top right. |
| Save, publish | The buttons along the bottom, always there. |
| Go back | **← Pages**, top left. It asks first if there is unsaved work. |

Three differences from the laptop, all deliberate:

- **Panels cover the page instead of sitting beside it.** Puck's own layout puts
  them in columns either side of the canvas, which on a 390px screen leaves the
  page 204px to live in.
- **Blocks are added by tapping, not dragging.** You cannot drag out of a panel
  that is covering the thing you are dragging onto — and tapping is easier
  anyway.
- **Renaming a page and changing its URL is not here.** That is `/admin` →
  **Pages**, which works on a phone too. The bars are for the page's layout.

Landscape works and gives the page more height. Anything wider than 900px gets
the laptop layout.

### The blocks

| Block | For |
| --- | --- |
| Hero | Badge, headline, sub-headline, lead paragraph, date line, button |
| Hosted-by bar | Partner brands, each with their own logo (see below) |
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

### Partner logos in the hosted-by bar

Ask a partner for their logo and you get their lockup: the symbol **and** the
wordmark, in their colour. That is what they want shown, so that is what the bar
shows — whatever shape it comes in.

Per brand:

| Field | What it does |
| --- | --- |
| **Logo** | Upload theirs. Any shape — a long wordmark, a square symbol, a stacked lockup. |
| **Behind the logo** | *Nothing* (default), *White card* if the file has its own white background, *Dark card* if the logo itself is white. |
| **Logo size** | *Default*, or nudge one *Smaller* / *Larger* when it reads too heavy or too light beside the others. |
| **Brand name** | *Let the logo say it* (default when there is a logo — their wordmark is already in it), or *Print it beside the logo*. |
| **Initials** | Only used until a logo is added. |
| **Link** | Optional. Opens in a new tab. |

**You do not have to make the logos match.** Each one gets a box — a height cap
and a width cap — and fits inside it, so a 5:1 wordmark is limited by the width
and a square symbol by the height. That is what stops one long logo dominating
the row, and it is why a set of mismatched files still reads as deliberate with
no work from you. Proportions are never squashed. On a phone the whole set scales
down together and keeps the same balance.

What to send a partner asking for: **PNG or SVG, transparent background, at least
600px wide.** If all they have is a white version, upload it and choose *Dark
card*.

### Linking out to GoHighLevel

Any link field takes an address anywhere, so point a button straight at a funnel
step. All three of these work and mean the same thing:

```
go.ecommharvest.com/register
https://go.ecommharvest.com/register
//go.ecommharvest.com/register
```

**The `https://` is filled in for you** when you leave it out. That is not
cosmetic: an address written without it is, by HTML's rules, a *path* — so
`go.ecommharvest.com/register` used to send people to
`app.ecommharvest.com/go.ecommharvest.com/register`, with no error and nothing
looking wrong until the button was clicked. The rule now is the one you would
apply reading it: something with a dot before the first slash is an address,
anything else is a path on this site. `/register` stays a path, and `register`
becomes `/register`.

Links that leave the site open in a new tab, decided the same way — so a visitor
mid-funnel keeps the page they came from.

Pages built here are for the parts you want to control; GHL keeps the forms,
contacts and workflows.

### The home page and the masterclass page

`/` and `/masterclass` are page-builder pages like any other — edit and
republish them without a deploy. They keep their own URLs rather than living
under `/p/` because those are the addresses that get printed and advertised.
`/p/home` and `/p/masterclass` redirect to them, so each page has exactly one
address.

Their content was extracted from the pages that already existed, by
`scripts/extract-pages.mjs` walking the real DOM — so the first version in the
builder *is* the page that was live, curly quotes and all, rather than a retyped
approximation. They are installed by a migration, so a deploy creates them once
and never touches them again.

Until that migration runs, both routes fall back to the generated block. That
matters during a deploy: the site keeps showing the real page rather than a 404.

**One thing to know:** the masterclass page here and the block pasted into
GoHighLevel are now two separate things. They started identical, but editing one
does not change the other. The GHL funnel on `go.ecommharvest.com` takes the
registrations; this is the page on the site. Keep them in step by hand, or decide
which one you advertise.

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
npm run dev                                  # in another terminal, migrated and seeded
npm run test:builder                         # 51 checks, HTTP: permissions and the API
npm run test:builder:ui                      # 35 checks, real browser: the editor itself
npm run test:manage                          # 16 checks: duplicate, delete, small screens, recovery
npm run test:mobile                          # 39 checks: the whole editing loop at 390×844
npm run test:styles                          # 16 checks: colours reaching both pages
npm run test:logo                            #  9 checks: one logo, four sizes, capped on phones
npm run test:nav                             # 15 checks: the menu, desktop and phone
npm run test:images                          # 23 checks: upload, resizing, the delete guard
npm run test:hosts                           # 21 checks: partner logos of three shapes
npm run test:blog                            # 46 checks: writing, reading, the feed, the renderer
npm run test:funnel                          # 22 checks: the embedded form, both funnel pages
npm run test:tracking                        # 22 checks: consent, Do Not Track, the pixel
npm run test:security                        # roles, playback, the audit log
npm test                                     # 20 checks, no server needed

npm run build                                # then, against the build output:
npm run test:prerender                       #  6 routes must render per request
npm run test:schema                          #  every field has a migration behind it
npm run test:importmap                       # the admin can resolve every component
npm run test:admin                           # /admin answers with a page, not a blank one
```

Two things the browser suites need, both of which produce failures that look like
bugs in the code:

- **A migrated database, not just a seeded one.** `npm run seed` creates the
  course, the users and the home and masterclass pages; `/privacy` and `/terms`
  come from a migration. Without them those routes fall back to a version with no
  site header, and `test:nav` reports a missing menu.
- **A Chromium that Playwright recognises.** If it is installed somewhere else,
  pass it: `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chromium npm run test:logo`.

`test/styles.ui.mjs` executes the claims that are invisible until they are wrong
on a live page: that one colour change reaches both pages with no deploy, that a
non-hex value is refused rather than written into a `<style>` tag, and that an
uploaded logo can be picked in the builder and ends up in the published markup.

`test/builder.e2e.mjs` covers permissions and the API. `test/builder.ui.mjs`
drives the actual editor, and it earns its keep: it caught a bug nothing else
could see. Puck merges a block's `defaultProps` when it *renders* in the editor
but not into the state it *saves*, so starter blocks written as
`{ type, props: { id } }` looked perfect on the canvas and published a page with
no words on it.

Every request in both suites sets an `Origin` header deliberately. Payload only
honours cookie auth for listed origins, so without one every call reads as
unauthenticated and both suites would pass for the wrong reason.
