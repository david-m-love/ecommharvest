# Founder Roadmap pages

Built from "Founder Roadmap Sales Pages: Copy Deck v2". Three pages, all created as **drafts** by migration `20261030_150000_roadmap_pages`. Nothing is live until you publish each one in the builder.

| Page | URL | Builder name |
|---|---|---|
| Short | `/roadmap` | Founder Roadmap (short) |
| Long | `/roadmap/preview` | Founder Roadmap (long) |
| After checkout | `/roadmap/thanks` | Founder Roadmap (after checkout) |

The pages are not indexed until published, and the thank-you page is never indexed.

## Before you publish: what is still open

1. **Stripe checkout link.** None was supplied, so the price button reads "Checkout opens shortly." and is not clickable. Paste the link into **Checkout URL** on the price block of `/roadmap` and `/roadmap/preview`. Every other button on a page scrolls to that block, so it is the only place the link lives. (The thank-you link target in your Stripe settings should be `/roadmap/thanks`.)
2. **Four decisions**, shown on the page as square-bracket text until you decide. Suggested defaults are from the deck.
   - `[CLASS DAY AND TIME]`: used on both pages.
   - `[CLASS TERMS AFTER MONTH ONE]`: suggested "Stops automatically; opt in to $100/month to stay."
   - `[TURNAROUND RULE]`: suggested "Five business days after the listening call and after access or exports arrive, whichever is later."
   - `[ACCESS DELAY NOTE]`: suggested "I build with what exists and mark the gaps. Missing numbers become a short list of questions, not a delay."
3. **Pictures.** Upload in the builder; each block publishes nothing until it has one.
   - Mockup under the headline on both pages (Hero block, "Picture under the headline").
   - Five Hollow Pine Co. sample pages in the sample gallery on `/roadmap/preview` (pages 01, 04, 05, 06, 07), plus the two optional data pictures. Alt text: describe the page, no dashes.
   - A photo of David in the "From one founder to another" block.
4. **Thank-you page links.** "Start the questionnaire" and "Book your listening call" have no link yet, so neither button shows. Paste both into the two blocks' button link fields.
5. **Proof.** Testimonial and logo blocks are empty on purpose and publish nothing. Add a quote only with written permission.

## Things that behave differently from the deck

- **Hero buttons scroll to the price** instead of carrying the checkout link themselves. One link in one field means the two cannot disagree. The click is tracked as `InitiateCheckout` for "eCommHarvest Founder Roadmap".
- **The ten sections are not tap-to-expand.** There is nothing more to show on expanding (number, title and one line are the whole entry), so each is a compact row inside three labelled groups.
- **The "What your $500 includes" list, "How it works" steps and "Three ways to grow" cards use the site's existing blocks**, in the Roadmap fonts (Lora headlines, Inter body) and palette. The font change applies only to these three pages.
- **The "three ways to grow" paragraph sits above the cards**, not below them.
- The Roadmap headline A/B variant ("Know exactly what to work on next to grow your store.") is not built; change the Hero headline to test it.

## Rules the tests enforce

`npm test` (unit) and `npm run test:roadmap` (browser, once published): no em or en dash anywhere, including title, description and share-image alt text; `$500` exactly and no struck-through price; never "Water"; "eCommHarvest" spelling; only the four declared bracket tokens; every proof slot empty; one checkout link per page; no sideways scroll; buttons at least 48px and full width on a phone.

## Filling the four decisions later

`fillPlaceholders` in `src/lib/roadmap.ts` replaces every copy of a decision across a page. Edit the text in the builder, or ask for a migration that fills them in one go.
