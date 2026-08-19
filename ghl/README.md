# GoHighLevel handoff

The masterclass and thank-you pages, converted into blocks you can paste into
GHL's page builder, plus the course outline for Memberships.

```
ghl/blocks/masterclass-styles.css   paste ONCE into Funnel Settings -> Custom CSS
ghl/blocks/1-hero.html              header, hero, hosted-by bar
ghl/blocks/2-body.html              faith-first, curriculum, paid social, who it's for, speakers
ghl/blocks/3-cta-heading.html       final CTA card  <-- GHL FORM ROW GOES BELOW THIS
ghl/blocks/4-footer.html            footer
ghl/blocks/thanks.html              whole thank-you page, one block
ghl/blocks/home-1-body.html         HOME: hero, the three arms, your-copy section
ghl/blocks/home-2-cta.html          HOME: masterclass CTA + footer
ghl/course-outline.md               5 categories / 14 lessons for Memberships
ghl/src/                            source the blocks are generated from
ghl/build.mjs                       regenerates blocks (node ghl/build.mjs)
ghl/verify.mjs                      proves the blocks are safe to paste
```

## Why it's blocks and not a file

GHL has no page import. You paste body HTML into a **Custom JS/HTML** element
(Elements → Add element → search "Custom") and put CSS in **Settings → Custom
CSS**. So the page arrives as sections, not as an upload.

Splitting at the form boundary is deliberate: it lets GHL's native form sit
between blocks 3 and 4, which is the layout you wanted.

## The part that would have broken it

The original stylesheet declares `*`, `html`, `body`, `a`, `p`, `h1`, `h2`, `h3`,
`footer` and 120 classes including `.btn`, `.card`, `.field`, `.badge`, `.bar`.
Pasted into GHL as-is, that restyles **GHL's own buttons, form inputs and
typography** on the page — and GHL's CSS leaks back the other way.

So the conversion does three things:

1. **Prefixes every class `ech-`** — GHL's `.btn` can no longer touch our `.ech-btn`.
2. **Scopes every selector under `.ech-scope`** — our CSS cannot reach outside the blocks.
3. **Marks declarations `!important`** — page builders emit `!important` liberally,
   and `!important` beats specificity, so this is the only way to hold the design.

Consequence worth knowing: **your own tweaks in GHL will also need
`!important`**, and a selector at least as specific as `.ech-scope .ech-thing`.

Verified adversarially, not by eye — `node ghl/verify.mjs` renders the blocks
against deliberately hostile page-builder CSS and confirms the result is
pixel-identical, that a mock GHL form on the same page keeps its own styling, and
that no block has unbalanced tags. Twelve hostile rules, all defended.

## Paste order

1. **Funnel Settings → Custom CSS** — paste `masterclass-styles.css`. No `<style>`
   tags; GHL adds them. Do this first, or the blocks look unstyled.
2. **Page head** (Settings → Tracking Code → Head) — the fonts, once:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
   ```
   Without this the page falls back to system fonts — readable, but not the design.
3. **Set the page background to `#FFFFFF`** and row padding to 0. The blocks bring
   their own spacing; GHL's default row padding will double it.
4. Add a Custom JS/HTML element per block, in order: `1-hero`, `2-body`,
   `3-cta-heading`.
5. **Add GHL's form element in its own row directly below block 3.** Set that
   row's background to `#16324F` and its top padding to 0, so the form reads as
   part of the dark card above it.
6. Add `4-footer` below the form row.
7. Thank-you page: one Custom JS/HTML element, paste `thanks.html`.

## Home page

Same stylesheet, two blocks: `home-1-body.html` then `home-2-cta.html`. No form,
so nothing goes between them.

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

## Form fields to create

| Field | Type | Notes |
| --- | --- | --- |
| First Name | standard | |
| Email | standard | |
| Store URL | custom, text | Optional. Useful for qualifying who's in the room. |
| Consent | custom, checkbox | Own field, so the agreement is evidenced |

Consent label to match the design:

> Send me the invite, the replay, and Q4 emails from eCommHarvest. Unsubscribe
> anytime. See our Privacy Policy.

Set the form's submit button text to **Save my seat** and redirect on submit to
the thank-you page.

## What still needs doing

Carried over — none of it is code:

1. **Privacy and terms.** Not converted (your call). The drafts are in git:
   `git show 60ca590^:public/privacy.html` and `…:public/terms.html`. Both need
   legal review, both have bracketed placeholders, and one real decision sits
   inside: whether the three host brands receive registrant details. Required
   before you run Meta ads.
2. **Host logos** — still `T3T` / `BOM` / `CFM` monograms. See `docs/logos.md`.
3. **Speaker photos and bios** — `DL` / `DC` monograms; both bios are drafts, and
   Derek hasn't seen his.
4. **The join link.** GHL doesn't host live webinars. Zoom/Demio link goes in the
   confirmation email; GHL can host the replay.

## Regenerating

Edit `ghl/src/`, then:

```bash
node ghl/build.mjs
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome node ghl/verify.mjs
```

Never edit `ghl/blocks/` directly — it's generated.
