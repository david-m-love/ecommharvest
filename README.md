# eCommHarvest — Q4 Masterclass Landing Page

Static design review page presenting four headline/positioning versions of the Q4
Masterclass landing page. Tabs at the top switch between versions (V1–V4); each
version is a full-page layout with its own hero, proof, and CTA treatment.

## Structure

```
public/index.html   Single self-contained page (inline CSS + JS, logo as data URI)
vercel.json         Static hosting config: clean URLs, cache + security headers
```

Nothing to build — `public/` is served as-is. External dependency: Google Fonts
(Plus Jakarta Sans, IBM Plex Mono).

## Local preview

```bash
npx serve public
```

## Deploy

Vercel, output directory `public`, no build step:

```bash
vercel deploy --prod
```

Or connect the repo in the Vercel dashboard — the settings in `vercel.json` are
picked up automatically.

## Status

Copy in the sections marked `PLACEHOLDER SECTION` is lorem ipsum standing in for
final copy. Every CTA currently links to the in-page `#register-v*` anchors and
needs a real registration URL before this goes in front of traffic.
