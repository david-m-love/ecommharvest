# eCommHarvest brand brief

Everything below is read from the live design system
(`src/styles/design-system.css`) and the rules this site actually enforces — not
an aspiration. **If you change a colour in Site Styles, change it here too.**

Its main use is as a paste-in brief for an AI tool generating ads, images or
copy. Copy the block under [The paste block](#the-paste-block); the rest is why.

---

## The short version

A harvest metaphor rendered seriously. Deep navy and wheat gold, warm off-whites
rather than cold greys, generous space, tight confident headlines. It should look
like a firm that knows numbers, not like a course launch.

**The audience is Latter-day Saint e-commerce founders** — people running a real
store alongside a family and a calling. Respected, not flattered; never preached
at.

---

## Colour

| Role | Name | Hex | Where it goes |
| --- | --- | --- | --- |
| Primary dark | Ink Navy | `#16324F` | Headings, body text, dark sections |
| Deeper navy | — | `#0F2439` | Gradient ends, text on gold |
| **Accent** | **Wheat Gold** | **`#C99132`** | Buttons, rules, one highlight per view |
| Accent, text-safe | Deep Gold | `#8B6423` | Small gold text on light (contrast) |
| Warm dark | Harvest Brown | `#45331B` | Body copy on light sections |
| Light | Linen Cream | `#F2ECE0` | Text on navy, chips, soft panels |
| Cool light | Chalk Blue | `#A9BECF` | Secondary text on navy |
| Background | Wash | `#F5F0E6` | Alternating section bands |
| Background | Wash 2 | `#FBF8F3` | The lightest band |
| Body text | Muted | `#4E627A` | Supporting paragraphs |
| Hairlines | Line | `#DCE5EC` | Borders, dividers |
| Base | White | `#FFFFFF` | Default page |

**Rules that matter**

- **Gold is an accent, never a background field.** One gold element per
  screenful — a button, a rule, or a highlight. Gold panels look like a discount
  banner, which is the opposite of the positioning.
- **Dark sections are a gradient, not flat navy:**
  `linear-gradient(163deg, #183551 0%, #16324F 50%, #102439 100%)`.
- **Never pure black, never pure grey.** The neutrals are warm; a `#888` in the
  middle of this palette reads as a different brand.
- Gold text on white must be **Deep Gold `#8B6423`**, not `#C99132` — the bright
  gold fails contrast at small sizes.

## Type

Two families, both free on Google Fonts:

- **Plus Jakarta Sans** — everything. Weights 400, 500, 600, 700, 800.
- **IBM Plex Mono** — weights 400, 500. Only for small uppercase labels, dates
  and stamps. Never for body copy.

| Element | Size | Weight | Tracking |
| --- | --- | --- | --- |
| H1 | 36–56px fluid | 800 | **−0.042em** (very tight) |
| H2 | 27–38px fluid | 800 | −0.035em |
| H3 | 20px | 800 | −0.022em |
| Deck (sub-headline) | 19–24px | 600 | −0.022em |
| Body | 17px / 1.6 | 400 | normal |
| Lede paragraph | 19.5px | 400 | −0.012em |
| Eyebrow | 12.5px | 800 | **+0.13em**, UPPERCASE |
| Button | 16px | 700 | +0.02em, UPPERCASE |
| Mono stamp | 10.5–12px | 400–500 | +0.06em, UPPERCASE |

**The signature is the contrast:** headlines set very tight and heavy, against
small uppercase labels set very wide. Get those two right and it looks like the
brand even in the wrong colours.

Headlines cap at about **17 characters per line**; body at 66. Sentence case,
with a full stop. Never title case, never ALL CAPS headlines.

## Shape and layout

- **Buttons are full pills** — `border-radius: 999px`, gold, navy text,
  uppercase, 14×28px padding.
- **Cards**: 26px radius (16px for small ones), 32–44px padding, 1px hairline
  border, warm off-white fill.
- Content column maxes at **920px**. Generous vertical space between sections.
- Sections alternate white / warm off-white. No heavy dividers — the background
  change *is* the divider.
- **No drop shadows** except one soft lift on the final dark card. No glows, no
  gradients other than the navy one, no outlines, no 3D.

## Logo

`public/logo.png` — 696×120, transparent. **Attach the actual file**; it cannot
be described into existence. Written out it is always **eCommHarvest**: lowercase
e, capital C, two m's, capital H. Never "Ecom Harvest", "EcommHarvest" or
"eCom Harvest".

## Voice

Plain, specific, calm. Short sentences. British-ish restraint in an American
market — understatement rather than exclamation.

**Do**
- Name the real thing: "your promotional calendar", "what you can afford to pay
  to acquire a customer".
- Admit limits, and let that do the persuading: *"We won't teach you Ads Manager
  in the room."*
- Use one number precisely rather than three vaguely.
- Let faith and family appear as context — a calling, a Sunday — with a light
  touch and self-deprecation, never instruction.

**Never**
- Hype punctuation: no "!!!", no 🔥🚀💰, no "CRUSH IT", no "secret".
- Earnings claims or implied income: never "make $X", never "results like this".
  Real numbers appear only as our own store's screenshots, labelled as ours, with
  *"I'm not promising you the same result"* beside them.
- Urgency theatre: no countdown timers, no "only 3 spots left" unless true.
- Religious instruction: never "honor the Sabbath", "put God first",
  "Christ-centered business". One light LDS-specific aside per asset is the
  ceiling.
- Fake scarcity, fake testimonials, fake screenshots.

## Imagery

Real screenshots and real photographs of real people. No stock photos of
handshakes, no AI-generated founders, no isometric illustrations, no floating
3D shapes. A cropped Shopify dashboard is better than any illustration.

Where a picture is not available, **typography on a navy gradient is the house
style** — that is what the share cards are, and it always looks right.

---

## The paste block

Copy everything between the lines into ChatGPT (or Midjourney, Canva AI, etc.)
before asking for an ad or an image. Attach `public/logo.png` alongside it.

---

You are designing for **eCommHarvest**, a marketing firm helping Latter-day
Saint e-commerce founders grow profitably. Follow this brand system exactly.

**Palette** — Ink Navy `#16324F`, Deeper Navy `#0F2439`, Wheat Gold `#C99132`,
Deep Gold `#8B6423`, Harvest Brown `#45331B`, Linen Cream `#F2ECE0`, Chalk Blue
`#A9BECF`, Wash `#F5F0E6`, White `#FFFFFF`.
Dark backgrounds use `linear-gradient(163deg, #183551, #16324F, #102439)`.
Gold is an accent only — one gold element per image, never a gold background.
Never pure black or neutral grey; the off-whites are warm.

**Type** — Plus Jakarta Sans throughout (800 for headlines, 400 body). IBM Plex
Mono only for small uppercase labels and dates.
Headlines: heavy, tight letter-spacing (−0.04em), sentence case with a full stop,
max ~17 characters per line.
Labels/eyebrows: 12.5px, weight 800, UPPERCASE, wide letter-spacing (+0.13em), in
gold.
The signature look is tight heavy headlines against wide small uppercase labels.

**Shapes** — Buttons are full pills (999px radius), gold fill, navy uppercase
text. Cards have 26px radius, hairline `#DCE5EC` borders, generous padding. No
drop shadows, no glows, no 3D, no illustration.

**Layout** — Generous whitespace. Content centred in a narrow column. Sections
separated by background colour changes, not lines or borders.

**Voice** — Plain, specific, calm. Short sentences. Understatement over
enthusiasm. Name real things rather than benefits in the abstract. Admitting a
limit is more persuasive than claiming more.

**Hard rules — do not break these:**
- Spell the brand exactly `eCommHarvest` (lowercase e, capital C, two m's,
  capital H).
- No income or earnings claims, and no implication of them.
- No hype punctuation, no emoji, no "secret", no "crush it", no fake urgency or
  countdowns.
- No religious instruction. Faith and family may appear as context, lightly and
  with humour, never as a lesson.
- No stock photography of business people, no AI-generated humans, no isometric
  or 3D illustration. Real screenshots and real photos only; otherwise use
  typography on the navy gradient.

---

## Current campaign facts

Keep these exact when generating anything about the masterclass — they are
enforced in code by `test/event.test.ts`:

- **Your Q4 Profit Playbook, Built in 60 Minutes** (never "Revenue Playbook")
- **Thursday, September 24, 11:00 AM Mountain Time** (1:00 PM ET / 10:00 AM PT)
- **60-minute working masterclass + up to 30 minutes of live Q&A** — the "up to"
  is deliberate
- Free. Workbook included. **No replay is promised.**
- Presented by **David Love** with **Derek Crimin** (one "m" in Crimin)
- Registration: `https://ecommharvest.com/masterclass/register`
