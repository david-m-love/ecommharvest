# eCommHarvest — Q4 Masterclass Landing Page

Landing page for a free 90-minute masterclass: *Your Q4 Revenue Playbook, Built
in 90 Minutes.* Aimed at LDS e-commerce founders. Presented by David Love with
special guest Derek Crimin (owner of B.O.M. Socks), hosted by Tiny 3D Temples,
B.O.M. Socks, and Come Follow Me FHE.

## Structure

```
public/index.html   Single self-contained page (inline CSS, logo as data URI)
vercel.json         Static hosting config: clean URLs, cache + security headers
```

Nothing to build — `public/` is served as-is. No JavaScript. External dependency:
Google Fonts (Plus Jakarta Sans, IBM Plex Mono).

Page order: hero → hosted-by trust bar → faith-first positioning → what you'll
learn → paid social / CAC → who this is for → speakers → final CTA.

## Local preview

```bash
npx serve public
```

## Deploy

Vercel, output directory `public`, no build step:

```bash
vercel deploy --prod
```

Or connect the repo in the Vercel dashboard — `vercel.json` is picked up
automatically.

## Open items

Search `index.html` for `TODO`:

1. **Host logos** — the three `.host-mark` spans are typographic monogram
   placeholders. Replace each with `<img src="logos/<brand>.svg" alt="<Brand>">`
   (drop them in `public/logos/`); `.host img` caps height at 42px. If a logo is
   a full wordmark, delete the adjacent `.host-name` span.
2. **Speaker photos and bios** — each `.sp-photo` holds a monogram (`DL`, `DC`);
   swap in square headshots. Both bios are drafts written from approach rather
   than credentials, and want real proof points. Derek's especially — confirm it
   with him before this ships.
3. **Date and time** — the hero `.when` line reads `[Date & time TBD]`. Needs the
   real date, start time, and timezone.
4. **Registration URL** — every CTA above the fold links to the `#register`
   anchor, and the button inside the final card is still `href="#"`. That one
   needs the real registration link, or better, an embedded form in its place.
