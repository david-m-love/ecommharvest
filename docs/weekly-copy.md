# `/weekly` — the copy as it stands

**Transcribed 19 October 2026** from `src/seed/weekly-pages.ts` (the `WEEKLY_PAGE`
export), which is what migration `20260928_120000_weekly_pages` wrote into the
database. That file has not changed since it was committed, and no later
migration touches the copy.

> ⚠️ **One caveat before you rely on this.** The live site could not be reached
> from the session this was written in, so this comes from the source rather than
> from the page itself. If you have edited `/weekly` in `/builder` since it went
> up, those edits live only in the production database and are **not** reflected
> here. If you have, paste me the live text and I’ll reconcile the two.

Each section below is labelled with its **block type** and **block id**, which is
how you’ll find it again in the builder. Copy is verbatim — nothing is tightened,
reordered or corrected. That’s your job.

**There is a section at the end, [What is not actually on the page](#what-is-not-actually-on-the-page), that is probably worth reading first.** Several
things here don’t render, and one of them is the join button.

---

## 1. Header — `wk-header-0`

- Logo text: **eCommHarvest**
- Links to: `https://ecommharvest.com/`
- Right-hand text: **$100/month · cancel anytime**
- Menu: **hidden** (deliberate — a page with one decision on it shouldn’t offer five others)

---

## 2. Hero — `wk-hero-1`

**Eyebrow:** eCommHarvest Weekly

**Heading:**
> A Fractional CMO in Your Corner — Every Week.

**Deck:**
> Weekly e-commerce coaching for LDS founders who want help knowing what to do next, what matters most, and how to grow profitably.

**Body:**
> You don’t need another giant course.
>
> You need somewhere to bring the question you’re wrestling with right now — your promotion, Meta ads, email strategy, product launch, conversion rate, offer, or marketing plan — and get experienced eyes on it.

**Button:** `Join eCommHarvest Weekly — $100/month` → scrolls to `#join`

**Under the button:** Cancel anytime.

---

## 3. Authority strip — `wk-stats-2`

**Eyebrow:** Who you’re listening to

**Heading:**
> Advice from someone who’s actually been in the arena.

Four points, **all with empty number fields**, so they render as words only:

- Built and operated e-commerce businesses
- Sold an e-commerce business
- Fractional CMO to multiple Shopify brands
- Meta ads, Klaviyo and conversion work

---

## 4. Logo ticker — `wk-logos-3`  ❌ *not rendering*

**Heading:** E-commerce brands I’ve had the opportunity to work with

No logos uploaded, so **the entire section publishes nothing.** Invisible to
visitors; visible to you in the builder.

---

## 5. Prose — `wk-problem-4`

**Eyebrow:** The real problem

**Heading:**
> You probably don’t need more information. You need help deciding what to do.

**Body:**
> As a founder you’re responsible for the product, the inventory, the customers, the operations and the people — and somehow you’re also supposed to become an expert marketer.
>
> It’s easy to spend 80% of your time building the product and 20% actually marketing it.
>
> eCommHarvest Weekly gives you a regular place to step out of product mode, look at the business, and decide what marketing deserves your attention next.

*Background: white*

---

## 6. Question list — `wk-questions-5`

**Eyebrow:** Bring the real one

**Heading:**
> The questions people actually turn up with.

*(Body field is empty.)*

Eight question cards:

1. Should I run this promotion?
2. Why aren’t my Meta ads working?
3. What should I email my list this week?
4. How should I launch this new product?
5. Is my website the problem?
6. Should I raise my price?
7. Which marketing project should I work on first?
8. What should my Q4 plan actually look like?

---

## 7. What happens each week — `wk-week-6`

**Eyebrow:** What happens each week

**Lead-in:**
> Bring the business. We’ll work through it together.

Seven bullets (bold lead, then the rest):

- **A weekly live group strategy call** — one session, every week
- **Ask your current questions** — about the business you are actually running
- **Feedback on promotions and launches** — before you run them, not after
- **Review ads, email, website or offers** — bring the account or the page
- **Learn from the room** — other founders’ questions are usually yours too
- **Community access** — somewhere to ask between calls
- **Accountability** — to actually market the business, not just build it

---

## 8. Case study — `wk-case-7` (dress socks)

**Eyebrow:** Case study

**Heading:**
> Dress sock brand grows November revenue 144% year over year.

**Body:**
> We combined Meta advertising, email marketing, conversion optimisation and promotional planning to grow November revenue from approximately $90,000 to $213,024 year over year.

| Before | After | Change |
|---|---|---|
| ~$90,000 | $213,024 | +144% YoY |

**Note:** November 2024 compared with November 2025, same store.

*No screenshots uploaded. Background: white.*

---

## 9. Testimonial — `wk-quote-8`

*(No eyebrow, no heading — just the quote.)*

> If you’re looking for a marketer that’s actually done it, this is your guy. David Love understands how to build a brand from scratch. With a handful of his own stores, he understands what it takes to start, grow, and even sell a business. A great asset for my Shopify store.

**— Mitch Adams**, LDS Paint By Numbers

*No photo uploaded.*

---

## 10. Case study — `wk-case-9` (Klaviyo)

**Eyebrow:** Case study

**Heading:**
> Klaviyo attributed about $26,000 a month to one advanced email flow.

**Body:**
> We found a significant gap in a floating-shelf brand’s Klaviyo account and built an eight-email flow for one of its primary product lines. The flow later reported approximately $26,000 per month in attributed revenue.

| After | Change |
|---|---|
| ~$26,000 | per month, attributed |

**Note:** Revenue as attributed by Klaviyo, not a measured incremental lift.

*Background: white.*

---

## 11. Case study — `wk-case-10` (jewellery)

**Eyebrow:** Case study

**Heading:**
> Jewellery brand sees 15x return from an email marketing buildout.

**Body:**
> Popup strategy, a welcome flow, abandoned cart, and regular campaigns — built from scratch and then run as an ongoing programme.

| After | Change |
|---|---|
| 15x | return |

**Note:** Return as reported by the brand’s email platform. Definition to be confirmed before publishing.

*Background: off-white.*

---

## 12. Who you’re working with — `wk-david-11`

**Eyebrow:** Who you’re working with

**Heading:**
> I’m not teaching this from a textbook.

**David Love** — E-commerce founder, operator and growth strategist
*(monogram DL, no photo uploaded)*

> I have built e-commerce businesses and operated them — the inventory calls, the margins, the hiring, the months where the plan did not work. I have sold one. I am a co-owner of Tiny 3D Temples and a partner in Come Follow Me FHE.
>
> Alongside that I work as a marketing strategist across multiple Shopify brands, on Meta advertising, email and SMS, offers and conversion.
>
> That combination is the whole point. Plenty of people can tell you what a good ad looks like. Fewer have had to decide whether to run the promotion when the inventory is already paid for.

---

## 13. Fit lists — `wk-fit-13`

**Eyebrow:** Fit

### This is probably for you if…

- You own or lead an e-commerce business.
- You’re serious about growing it.
- You have more marketing questions than time.
- You’re tired of guessing what to work on.
- You want experienced feedback without hiring a full agency.
- You want to learn alongside other LDS e-commerce founders.

### Probably not for you if…

- You’re looking for someone to run your entire business for you.
- You want overnight results without implementing anything.
- You’re looking primarily for a beginner Shopify course.

---

## 14. Dark card — `wk-faith-14`

**Eyebrow:** The room

**Heading:**
> Built for LDS e-commerce founders.

**Body:**
> Business is only one part of life. This is a community of founders who understand that we’re trying to build profitable companies while also making room for family, faith, service and everything else that matters.

**Closing line (emphasised):**
> You don’t have to explain those priorities here. We already get it.

---

## 15. Pricing card — `wk-price-15`  ⚠️ *button disabled*

**Eyebrow:** The offer

**Name:** eCommHarvest Weekly
**Price:** **$100**/month

**Body:**
> Weekly access. Real questions. Real businesses. Practical marketing help.

**What’s included:**

- One live group strategy call every week
- Bring your store, your numbers and your actual question
- Feedback on ads, email, offers, promotions and your website
- Learn from the questions other founders bring
- Community access between calls

**Button:** `Join eCommHarvest Weekly`
**Terms:** Recurring monthly membership. Cancel anytime.
**Risk line:** No long-term contract. Cancel anytime.

*Compare-at price, founding-member line, cap and urgency fields are all empty.*

🚨 **The checkout URL is empty, so this button is currently dead** — it renders
greyed out reading "Joining opens shortly." See the end of this document.

---

## 16. FAQ — `wk-faq-16`

**Eyebrow:** Questions

**Heading:**
> Before you join.

**Q: What happens on the weekly call?**
> You bring a real question about your business — a promotion you are planning, an ad account that is not working, an email you are not sure how to write, a launch you are sizing up. We work through it together, out loud, and you leave knowing what to do next.

**Q: What kinds of businesses is this for?**
> E-commerce businesses with products shipping and traffic arriving. You do not need to be large. You do need something real to work on.

**Q: Do I need to be a member of The Church of Jesus Christ of Latter-day Saints?**
> No. The community is built for Latter-day Saint founders, and that shapes the room — but nobody is asked about it, and the marketing advice is the same either way.

**Q: Is this a course?**
> No. There is no curriculum to work through and no library to fall behind on. It is a standing appointment with someone who has run these businesses, about the one you are running.

**Q: Will you personally answer questions?**
> Yes. That is the whole product.

**Q: When are the calls?**
> ❌ *No answer written — does not appear on the page.*

**Q: What happens if I miss a call?**
> ❌ *No answer written — does not appear on the page.*

**Q: Is there a private community?**
> ❌ *No answer written — does not appear on the page.*

**Q: Can I cancel anytime?**
> Yes. It is a monthly membership with no contract and no minimum term. Cancel and you are not billed again.

**Q: Is this the same as hiring you as my fractional CMO?**
> No. A fractional CMO engagement means I am inside your business, in your accounts, accountable for the work. This is weekly access to the same thinking, shared with a room of other founders, at a fraction of the cost.

---

## 17. Testimonial — `wk-quotes-16b`

**Eyebrow:** In their words

**Heading:**
> Founders who have worked with me.

> If you’re looking for a marketer that’s actually done it, this is your guy. David Love understands how to build a brand from scratch. With a handful of his own stores, he understands what it takes to start, grow, and even sell a business. A great asset for my Shopify store.

**— Mitch Adams**, LDS Paint By Numbers

⚠️ **This is the same quote as section 9**, shown a second time.

---

## 18. Closing CTA — `wk-final-17`

**Eyebrow:** eCommHarvest Weekly

**Heading:**
> Stop guessing alone.

**Body:**
> Bring the question. Bring the numbers. Bring the store.
>
> We’ll figure out what deserves your attention next.

**Button:** `Join eCommHarvest Weekly — $100/month` → scrolls to `#join`

**Note:** Recurring monthly membership. Cancel anytime.

---

## 19. Footer — `wk-footer-18`

© 2026 eCommHarvest · [Privacy Policy](/privacy) · [Terms & Conditions](/terms)

eCommHarvest is a trading name of Love Your Marketing LLC.

---

# What is not actually on the page

Read before rewriting. None of this is visible from the copy alone — it comes
from the blocks’ render rules, which hide anything unfilled rather than
publishing an empty box.

### 🚨 The join button is dead

The checkout URL is empty, so both CTAs scroll to a pricing card whose button is
greyed out and reads **"Joining opens shortly."** The page cannot take money
until the GoHighLevel order form URL is pasted into **`/builder` → `/weekly` →
Price and join button → Checkout URL**.

This is deliberate — a disabled button tells you to go and paste the URL, where a
link to nowhere would just lose the sale quietly — but it is the single thing
standing between this page and revenue.

### ❌ Three sections or entries publish nothing

| What | Why | To fix |
|---|---|---|
| The whole logo bar (`wk-logos-3`) | No logos uploaded | Upload brand logos in the builder |
| "When are the calls?" | No answer written | Decide the day and time |
| "What happens if I miss a call?" | No answer written | Decide (recording? no recording?) |
| "Is there a private community?" | No answer written | **This one now has an answer — the community is built** |

That last row is worth acting on: the community exists now, so the question can
be answered.

### ⚠️ Mitch’s quote runs twice

Sections 9 and 17 are the same testimonial. It’s the only one supplied, and the
page has two testimonial slots. Either get a second quote, or cut one slot.

### ⚠️ Three case studies run back to back

Sections 8, 10 and 11, with Mitch’s quote wedged between the first two. If you
are simplifying, this is the densest stretch of the page and the most obvious
place to lose something.

### No images anywhere

Case-study screenshots, David’s headshot and the hero image are all empty. The
sections render without them; they’d be considerably stronger with them.

### The numbers that live outside this page

`$100`, `/month`, `Join eCommHarvest Weekly`, `Cancel anytime.` and
`Recurring monthly membership. Cancel anytime.` are defined once in
`src/lib/weekly.ts` and read by **both** `/weekly` and `/join`. Changing the
price means changing it there, not in the builder — which is the point, since it
makes the two pages unable to disagree about what it costs.
