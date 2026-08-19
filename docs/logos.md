# Host logos

The three `.host` slots in `index.html` currently render typographic monogram
placeholders (`T3T`, `BOM`, `CFM`). Drop the real files here and swap the markup.

Expected filenames:

```
tiny-3d-temples.svg
bom-socks.svg
come-follow-me-fhe.svg
```

Then in `index.html`, replace each placeholder pair:

```html
<span class="host-mark" aria-hidden="true">T3T</span>
<span class="host-name">Tiny 3D Temples</span>
```

with:

```html
<img src="logos/tiny-3d-temples.svg" alt="Tiny 3D Temples">
```

Keep the `.host-name` span only if the logo is a symbol without the brand name
in it. If the file is a full wordmark, delete the span so the name isn't
duplicated.

## Specs

- **Format** — SVG preferred. PNG at 3x the display height (126px tall minimum)
  is fine; `.host img` caps rendered height at 42px.
- **Background** — the bar sits on `--wash2` (#FBF8F3), a warm off-white. Logos
  need transparent backgrounds, and a white-knockout version will disappear.
- **Dark variants** — not needed, the bar is light in every state.

Alternatively, embed them as data URIs the way the eCommHarvest mark in the
header already is, which keeps the page a single self-contained file.
