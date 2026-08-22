# GoHighLevel handoff

Three funnel steps. You build step 2 in GHL; steps 1 and 3 are one paste each.

| Step | Page | Who builds it |
| --- | --- | --- |
| 1 | Masterclass landing page — every button links to step 2 | paste `LANDING-PAGE.html` |
| 2 | Registration — GHL's native form, wrapped in our brand | **the form is yours in GHL**; paste `REGISTER-1-above-form.html` above it and `REGISTER-2-below-form.html` below it |
| 3 | Thank you | paste `thanks-WITH-CSS.html` |

```
ghl/blocks/LANDING-PAGE.html            STEP 1 — whole page, one paste, CSS included
ghl/blocks/REGISTER-1-above-form.html   STEP 2 — goes ABOVE your form, CSS included
ghl/blocks/REGISTER-2-below-form.html   STEP 2 — goes BELOW your form, no CSS needed
ghl/blocks/thanks-WITH-CSS.html         STEP 3 — whole page, one paste, CSS included
ghl/blocks/home-1-WITH-CSS.html     HOME: first block, CSS included
ghl/blocks/home-2-cta.html          HOME: masterclass CTA + footer
ghl/course-outline.md               5 categories / 14 lessons for Memberships
ghl/paste-me/*.txt                  the same blocks as .txt — THIS is what you paste
ghl/src/                            source the blocks are generated from
src/styles/design-system.css        the design tokens and CSS (single source)
ghl/build.mjs                       regenerates blocks (node ghl/build.mjs)
ghl/verify.mjs                      proves the blocks are safe to paste
```

Split versions of the landing page also exist — `1-hero.html`, `2-body.html`,
`3-cta-footer.html` plus `masterclass-styles.css` — in case one 80kb paste ever
misbehaves in the builder. **Ignore them unless that happens.** They need the
stylesheet pasted separately, which is the step that failed to take effect before.

## Step 2 — wrapping GHL's form

Your form stays GHL's — that is the whole reason for being here, and rebuilding
it in HTML would put the contact record back where it does no good. These two
blocks bracket it so the page reads as a continuation of the one they clicked
from, rather than a different site that happens to want their email.

In the funnel step's editor, three rows top to bottom:

1. **Custom JS/HTML** → paste `REGISTER-1-above-form.html`. Logo bar, "Save your
   seat.", the date, and a line pointing down at the form. Carries the
   stylesheet, so it must be the first of the two.
2. **Your form element** — untouched.
3. **Custom JS/HTML** → paste `REGISTER-2-below-form.html`. What they walk out
   with, the no-spam line, the hosted-by bar, the footer. No stylesheet: block 1
   on the same page already loaded it.

Neither block contains a button or a field, and `ghl:verify` fails if one ever
appears. A second button beside "Save my seat!" splits the click; a second input
takes typing and submits nowhere.

**Why not build this in the page builder and copy the HTML out?** The builder
makes React pages styled by the site's own stylesheet, whose class names —
`.btn`, `.card`, `.field` — are the ones GHL uses too. Pasting that in restyles
GHL's form. Everything here is namespaced `ech-` and scoped, and proven against
hostile CSS by `ghl:verify`. Same design system, different output format: edit
`ghl/src/register.html`, run `npm run ghl:build && npm run ghl:verify`, paste
again.

## Step 1 — the landing page

One Custom JS/HTML element. That's the whole job.

1. Elements → Add element → search **"Custom"** → **Custom JS/HTML**.
2. Paste all of `ghl/paste-me/LANDING-PAGE.html.txt`.
3. Set the row's padding to 0 and the page background to `#FFFFFF`. The block
   brings its own spacing; GHL's default row padding doubles it.
4. Optional, for the fonts: Page Settings → Tracking Code → **Head**:
   ```html
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
   ```
   Without it the page falls back to system fonts — readable, but not the design.

No CSS field, no tracking-code requirement, no block ordering. The stylesheet is
inside the block.

### Where the buttons point

All four "Save my seat" buttons link to **`https://go.ecommharvest.com/register`**,
and the footer's legal links to **`https://ecommharvest.com/privacy`** and
`/terms`.

Absolute, not root-relative, because the domains are split three ways:

| Hostname | Platform |
| --- | --- |
| `ecommharvest.com` | Vercel — the site, legal pages, builder pages |
| `app.ecommharvest.com` | Vercel — admin and page builder |
| `go.ecommharvest.com` | **GoHighLevel** — this funnel, the form, email and SMS |

The same block is pasted into GHL *and* served by the app at
`ecommharvest.com/masterclass`, on two different hosts. A root-relative
`/register` would therefore mean two different things, and `/privacy` in the
footer would 404 on `go.` — on the page that has to carry a working privacy link
before any Meta ad can run.

Name step 2's path `register` and it works as built. Different path, rebuild:

```bash
REGISTER_URL=https://go.ecommharvest.com/save-my-seat node ghl/build.mjs
```

Do not leave it pointing at a path that doesn't exist — the buttons look fine in
the builder and 404 on the live page.

## Step 2 — the registration form (yours)

A plain GHL page: your form element, and nothing from me. Keep the headline and
the date visible so the page doesn't feel like a different site.

| Field | Type | Notes |
| --- | --- | --- |
| First Name | standard | |
| Email | standard | |
| Phone | standard | **Required if you want SMS.** No phone, no texts. |
| Store URL | custom, text | Optional. Useful for qualifying who's in the room. |
| Email consent | custom, checkbox | Own field, so the agreement is evidenced |
| SMS consent | custom, checkbox | **Separate field. See below.** |

**Email consent and SMS consent are two different permissions.** One checkbox
covering both is not valid consent for text messages under US TCPA rules, and
GHL will suspend an account that texts people who didn't agree to be texted. Two
checkboxes, two custom fields, two labels:

> **Email:** Send me the invite, the replay, and Q4 emails from eCommHarvest.
> Unsubscribe anytime. See our Privacy Policy.

> **SMS:** Text me the join link and a reminder before we start. Message and data
> rates may apply. Reply STOP to opt out.

Make the SMS box optional and the email box required — someone who won't take
texts should still get a seat.

Submit button text: **Save my seat**. Redirect on submit: step 3.

## Step 3 — thank you

One Custom JS/HTML element, paste `thanks-WITH-CSS.html`. Same as step 1: the
stylesheet is included.

## Then the workflow

Trigger **Form Submitted** on step 2's form →

1. Tag `masterclass-2026-09-03`
2. Email: the join link (Zoom/Demio — GHL does not host live webinars)
3. SMS, filtered to contacts where SMS consent is true: the join link
4. Reminders at 24h and 1h
5. Replay email after, to everyone who registered

## Why the blocks can't break your GHL page

The original stylesheet declares `*`, `html`, `body`, `a`, `p`, `h1`, `h2`, `h3`,
`footer` and 120 classes including `.btn`, `.card`, `.field`, `.badge`, `.bar`.
Pasted as-is, that restyles **GHL's own buttons, form inputs and typography** on
the page — and GHL's CSS leaks back the other way.

So the conversion does three things:

1. **Prefixes every class `ech-`** — GHL's `.btn` can no longer touch our `.ech-btn`.
2. **Scopes every selector under `.ech-scope`** — our CSS cannot reach outside the blocks.
3. **Marks declarations `!important`** — page builders emit `!important` liberally,
   and `!important` beats specificity, so this is the only way to hold the design.

Consequence worth knowing: **your own tweaks in GHL will also need
`!important`**, and a selector at least as specific as `.ech-scope .ech-thing`.

Verified adversarially, not by eye — `node ghl/verify.mjs` renders the blocks
against deliberately hostile page-builder CSS and confirms the result is
pixel-identical, that a mock GHL form on the same page keeps its own styling,
that every CTA links forward rather than at a dead in-page anchor, and that no
block has unbalanced tags. Twelve hostile rules, all defended.

## Copying a block without mangling it

Double-clicking an `.html` file opens it in a browser, which **renders** it — so
copying that window gives you the visible words with every tag stripped out.
That paste is useless, and the failure looks like the file was wrong.

Use `ghl/paste-me/*.txt` instead: same bytes, but a text editor opens them, so
select-all copies the actual source. (`Cmd/Ctrl+U` in a browser also shows source.)

**Never route the text through Word, Pages or Google Docs.** They convert straight
quotes to curly ones, so `class="ech-scope"` becomes `class="ech-scope"` with
smart quotes, and the HTML silently breaks.

## Home page

Two blocks: `home-1-WITH-CSS.html` then `home-2-cta.html`.

**A designed home page did not exist before this.** The app's `/` was a
placeholder to make the build work; the masterclass was the only finished page.
So this is new: hero, the three-arms section (your actual strategy, reusing the
CAC formula), and then a **clearly marked placeholder section for your copy** —
heading, lead paragraph, and a three-point bullet list, using the same classes so
whatever you write stays on brand.

Send me your home page copy and I'll replace that section properly.

The logo is embedded as a data URI, so nothing needs uploading. If you'd rather
serve it from GHL's media library, replace the `src="data:image/png;base64,…"`
with the hosted URL and the blocks shrink to ~2KB.

## What still needs doing

Carried over — none of it is code:

1. **Privacy and terms.** Not converted (your call). The drafts are in git:
   `git show 60ca590^:public/privacy.html` and `…:public/terms.html`. Both need
   legal review, both have bracketed placeholders, and one real decision sits
   inside: whether the three host brands receive registrant details. Required
   before you run Meta ads. The landing page's footer links to `/privacy` and
   `/terms`, so those two GHL pages need to exist at those paths.
2. **Host logos** — B.O.M.Socks is live, from their site, but it's their *white*
   logo so it sits on a navy disc. Send the dark or colour version and the disc
   goes away. Tiny 3D Temples and Come Follow Me FHE are still `T3T` / `CFM`
   monograms. See `docs/logos.md`.
3. **Speaker photos and bios** — `DL` / `DC` monograms; both bios are drafts, and
   Derek hasn't seen his.
4. **The join link.** GHL doesn't host live webinars. Zoom/Demio link goes in the
   confirmation email and SMS; GHL can host the replay.
5. **The `-3154` URL suffix.** GHL appended it because the path was already
   taken. Fix it in the funnel step's settings so the URL reads
   `ecommharvest.com/masterclass`.

## Regenerating

Edit `ghl/src/`, then:

```bash
node ghl/build.mjs
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome node ghl/verify.mjs
```

Never edit `ghl/blocks/` directly — it's generated.

The stylesheet lives at **`src/styles/design-system.css`**, not under `ghl/`. It
used to exist twice — once here, once in the Next app — and the two copies had
already drifted apart by three fixes before it was noticed. One file, two
consumers.

`ecommharvest.com/masterclass` on the Vercel deployment serves
`ghl/blocks/LANDING-PAGE.html` directly, so what you proof there is byte-for-byte
what you paste into GHL.
