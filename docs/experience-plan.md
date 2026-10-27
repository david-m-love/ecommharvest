# eCommHarvest — the whole experience: audit and plan

*27 October 2026. Written after walking the site as a stranger, a paying member and
an admin, with a seeded community on screen — not from the code alone.*

> **One caveat on what I saw.** The public-page findings (stale dates, no link to
> the offer, no mention of Weekly) come from a database built from the committed
> migrations, which is what production was seeded from. If you have edited those
> pages in `/builder` since, production may differ. Everything else — the member
> area, the admin, the code — is exactly what is deployed.

---

## 1. The verdict

You are right that the member area is too simple, but it is the *smallest* of
three problems. In order of how much they cost you:

1. **The front door sells a product you have moved on from.** Nothing on the
   public site mentions Weekly. The home page, masterclass, register and thank-you
   pages all still say *Thursday, September 24* — a date a month gone — with a
   button to "start with the free masterclass". A stranger cannot reach the offer,
   and a member cannot find the login.
2. **The member area has no reason to be returned to.** It is a list of
   questions. Nothing tells a member that somebody answered them, so the first
   unanswered question kills the habit. There is no email, no "new since you
   were last here", no search (the page *says* "stay searchable"; there is no
   search), no screenshots, and the page you land on after signing in is *My
   courses* — a course area you have chosen to hide.
3. **The money is still manual.** Joining is a dead button, access is granted by
   hand, nothing happens on cancellation.

The good news: the foundations are sound. Auth, entitlements, the audit log, the
rate limiter, the block library and a real test suite are all in place, so almost
everything below is *building on* what exists, not restructuring it.

---

## 2. What each person experiences today

### A stranger (an ad, a share, a search)

| Finding | Evidence | Severity |
| --- | --- | --- |
| Home, masterclass, register and thank-you pages advertise **September 24** | Header and hero button on `/`; present in 4 of 9 pages | 🔴 Credibility |
| **No page mentions Weekly or links to `/join` or `/weekly`** | Searched every page's content | 🔴 Revenue |
| `/weekly` and `/join` are **drafts** and the checkout button is **dead** | Both 404; `WEEKLY_CHECKOUT_URL` is empty | 🔴 Revenue |
| **No header menu is configured**, and no link to sign in | Site Styles menu is empty | 🟠 |
| The date is typed into code, so every event **goes stale on its own** | `src/lib/event.ts` | 🟠 Recurs forever |
| Pages render on every request | `export const dynamic = 'force-dynamic'` on the layout | 🟡 Slower for paid traffic |

### A paying member

| Finding | Evidence | Severity |
| --- | --- | --- |
| Lands on **My courses** after signing in — a hidden product | `DEFAULT_LANDING = '/learn'` | 🔴 First impression |
| **No notification of any kind.** The only email the app sends is the login link | One `sendEmail` call in the whole codebase | 🔴 Retention |
| "Answers stay searchable" — **there is no search** | No search route or box | 🔴 Broken promise |
| **Plain text only, no images.** Founders post screenshots of ad accounts and flows | Collections are `textarea` | 🟠 |
| Times show as `03:19` in **UTC**, no zone stated | `formatWhen` fixed to UTC | 🟠 Confusing for a US audience |
| Cannot edit or delete **their own** post, mark an answer, or see what's new | By design in v1 | 🟠 |
| The weekly call is a **line of free text** above the feed | `CallPanel` | 🟠 |
| No welcome, no "start here", no introductions | — | 🟠 First week decides retention |
| **No account page**: cannot change email, see renewal date, find billing, or cancel | Only `/community/profile` | 🟠 Support load |
| Phone nav wraps ("My courses" / "Sign out" each break onto two lines) | Screenshot at 390px | 🟡 |

### You (admin)

| Finding | Evidence | Severity |
| --- | --- | --- |
| `/members` loads 100 people with no pagination and no "joined / last seen / renews" | `limit: 100` | 🟡 Fine now, breaks at ~100 |
| No **report** button, no queue, no way to suspend a member | Moderation is pin/close/delete only | 🟠 |
| **`/privacy` and `/terms` never mention a community**, user posts, or a code of conduct | Searched both | 🟠 Legal — see §5 |
| No notification when somebody posts a question and you haven't answered | — | 🟠 You are the product |

### The platform

| Finding | Severity |
| --- | --- |
| **`/login?next=/\evil.example` redirects a signed-in visitor off-site.** `src/app/(frontend)/login/page.tsx:27` still uses the old `startsWith('/')` check I replaced in the sign-in route. `/community/profile` has the same gap (`route.ts:38`) | 🔴 **Fix first** |
| **No CI.** The 129 unit assertions and several hundred browser checks only run if somebody remembers | 🟠 |
| The session cookie has **no `Secure` flag** | 🟠 |
| **No error monitoring** — a failed send is a line in a Vercel log nobody reads | 🟠 |
| The database host is described in the code as one that **pauses when idle** — a paid product's first login of the day would be slow | 🟠 Verify the plan |
| Three branches of unmerged work, including a **header button, dropdown menus and a depth-and-motion pass** (~6,000 lines, with a migration) | 🟠 Will conflict the longer it waits |
| No skip-to-content link; no custom 404 or error page | 🟡 |

---

## 3. The decision that shapes everything

**What is the site *for* now?** I'd propose, and everything below assumes:

> **eCommHarvest Weekly is the product.** The free masterclass is the recurring
> *event* that feeds it, not a product of its own. The course area stays hidden.

That makes the public site a funnel with one destination, the member area the
reason to stay, and the admin a small tool for one person. If you would rather
the masterclass remain the main offer, §6 changes — tell me.

Content guardrails carry forward unchanged: no invented testimonials, logos,
results or numbers; Rexburg, Idaho only; Derek **Crimin**; the LDS tone rules
(no "honor the Sabbath", no "put God first").

---

## 4. The plan

Effort is focused working days, mine, excluding your review and anything that
needs your accounts. Phases are ordered by what unblocks money and retention.

### Phase 0 — Stop the bleeding *(~2 days)*

| # | What | Why |
| --- | --- | --- |
| 0.1 | Fix both open redirects with `safeNext`; add the cases to the existing test | Security. Smallest change on this list, so it ships alone and first |
| 0.2 | **Sign-in landing by who you are**: Weekly member → `/community`, admin → `/members`, otherwise `/learn` | First impression. Stops the hidden-course page greeting paying members |
| 0.3 | **Merge `admiring-ptolemy`** (header button, dropdowns, depth, motion) and resolve the migration-list conflict | Every later page is built on this header; it only gets harder to merge |
| 0.4 | **Make events admin-controlled, not typed into code.** One "Next live session" setting in Site Styles drives the date everywhere, and the pages have a *past* state ("Next session coming soon — join the list") | This is why the September date is still live, and why it will be stale again in November |
| 0.5 | Retire "Thursday, September 24" from home, masterclass, register, thank-you and the share card | Credibility, today |
| 0.6 | Cookie `Secure` flag; confirm the production database does not auto-suspend; add DMARC for `notify.ecommharvest.com` | Cheap hardening before real members |
| 0.7 | **You:** paste the GoHighLevel order-form URL, publish `/weekly` and `/join` | The only thing between you and revenue |

### Phase 1 — A member area people return to *(~12–14 days)*

This is the heart of it. The principle: **a forum lives or dies on whether people
find out that somebody answered them.** So notifications come before polish.

| # | What | Notes |
| --- | --- | --- |
| 1.1 | **Notifications**: email when someone replies to your thread or a thread you replied to; a Thursday-morning digest ("3 new questions, 2 unanswered, call at 11"); a call reminder. Per-member preferences and one-click unsubscribe | Sent through the existing Resend setup. **Transactional only — never through GoHighLevel** (an unsubscribe there would silence a member's replies). This is the single biggest retention lever |
| 1.2 | **A member home ("Today")** at `/community`: next call + join, your threads with new replies, unanswered questions from others, what's new since your last visit | Replaces the bare feed as the front page; the feed becomes "All questions" |
| 1.3 | **Search** across questions and replies (Postgres full-text) | Makes "stay searchable" true. Search-before-you-ask also cuts duplicate questions |
| 1.4 | **Screenshots and links**: image attachments (size-limited, re-encoded, EXIF stripped), auto-linked URLs, basic emphasis and lists — *without* a rich-text editor or a sanitiser attack surface | Founders paste Meta and Klaviyo dashboards constantly. Plain text alone is the biggest functional limit for this audience |
| 1.5 | **Edit and delete your own post** (edit window, "edited" marker); **mark an answer** ("Answered", chosen by the asker or you) | Typos happen; an answered thread is the product |
| 1.6 | **A call hub**: date and time shown in *the viewer's* time zone (with MT stated), a calendar file, the join link, the pre-submitted questions, and after the call a "what we covered" post and recording link | Replaces the free-text panel. Time zones matter: members will be spread across several |
| 1.7 | **Onboarding**: a *Start here* page, an "Introduce yourself" thread that is pre-seeded and pinned, and a short community guidelines page accepted on first visit | The first week decides retention. Guidelines include "what's shared here stays here" — people post real revenue numbers |
| 1.8 | **Account page** at `/account`: names, email change, time zone, notification settings, membership status and renewal date, a "manage billing / cancel" link, sign out everywhere | Stops support emails before they exist |
| 1.9 | **Moderation**: a *Report* button, a queue you see, ability to suspend a member, and an email to you when a question has had no reply in 24 hours | You are the product; this keeps you from being the bottleneck |
| 1.10 | **Mobile and polish**: a real mobile nav, avatar initials, unread markers, a sticky reply box on phones | Depends on 0.3 |

**Deliberately left out of Phase 1:** chat, DMs, reactions, points or badges,
categories, a member directory. See §7.

### Phase 2 — Money, automated *(~5–6 days, after one answer from you)*

| # | What |
| --- | --- |
| 2.1 | `POST /api/webhooks/ghl`: shared secret, **grant until period end, renew on every payment**, never revoke on cancel — so a missed webhook lapses instead of persisting |
| 2.2 | Failed-payment handling: a grace period, a "your payment didn't go through" email from us, then lapse |
| 2.3 | A welcome email on purchase with a sign-in link and the *Start here* page; a day-3 and day-7 nudge for people who haven't posted |
| 2.4 | A cancellation page asking one question, and a win-back email at +30 days |

**I need one answer before starting:** does GoHighLevel's order form fire a webhook
on *recurring* payments, or only the first? It changes the whole design. Also
what happens when the payment email differs from the login email.

### Phase 3 — The public site as a funnel *(~6–8 days)*

| # | What |
| --- | --- |
| 3.1 | **Rebuild the home page around Weekly**, using only proof you have supplied; the masterclass becomes "the next live session" |
| 3.2 | A real header: *Weekly · Masterclass · Blog · Sign in*, and a sign-in link in the footer |
| 3.3 | **Static rendering with revalidate-on-publish.** Pages are rebuilt per request today; ad traffic pays for that in load time. Publishing in the builder would purge the cached page instantly |
| 3.4 | Measure the funnel: page → join click → purchase → first login → first post, with Meta events for ads and server-side events for what the pixel can't see |
| 3.5 | Blog and SEO: the blog exists and the audience (LDS e-commerce founders) is searchably underserved; plan a first ten posts |
| 3.6 | Custom 404, error page, skip link; an accessibility pass |

### Phase 4 — Platform *(~3–4 days)*

| # | What |
| --- | --- |
| 4.1 | **CI** on every push: typecheck, unit suite, schema check and the browser suites against a Postgres service |
| 4.2 | Error monitoring, and an alert on any failed email send |
| 4.3 | Backups and a tested restore; confirm point-in-time recovery on the database plan |
| 4.4 | Privacy: data export and account deletion; a stated retention rule for posts when a membership ends |
| 4.5 | Admin: paginate `/members`; show *joined, last seen, renews, posts* |

### Phase 5 — Later, only if the room asks *(not scheduled)*

Tags once there are ~100 threads; "helpful" votes; a member directory with
opt-in *what I sell / stage*; a resource library (templates, checklists) built on
the existing course tables; Google sign-in; the course area.

---

## 5. Things only you can do

- **Legal.** `/privacy` and `/terms` need a community: that people post under a
  display name, who can see it, how it is moderated, how long it is kept, and the
  recurring-billing and cancellation terms. **I can draft this, but it needs your
  lawyer's eye — I'm not going to ship it as written.**
- Paste the GoHighLevel checkout URL; publish `/weekly` and `/join`.
- Decide the weekly call's day and time, and create the recurring Zoom link.
- Answer the GoHighLevel webhook question above.
- Real proof: logos, screenshots, Mitch's headshot, a second testimonial.

## 6. Decisions I need from you

1. **Is Weekly the product and the masterclass the feeder?** (assumed above)
2. **Notifications in v1?** I'd say yes, and first — but it's the one item that
   adds a recurring email stream you'll want to review the wording of.
3. **Screenshots in posts?** They're the biggest value and the biggest moderation
   surface. I'd allow images, not files.
4. **What should happen to a member's posts when they leave?** Stay under their
   name, become "Former member", or be deleted. This is also a privacy question.
5. **Should I merge `admiring-ptolemy` now?** And which of the other branches do
   you actually want to keep?
6. **Do you want a public "preview" of the community** (a few questions visible
   to non-members as a sales tool), or strictly private?

## 7. What I would not build

- **Live chat or DMs.** Async Q&A is the model you chose, and it's the one that
  produces a searchable archive. Chat produces noise and an obligation to be online.
- **Points, badges, leaderboards.** They reward volume; you want quality.
- **A rich-text editor.** The cost is a sanitiser and a permanent attack surface;
  light formatting plus images covers the real need.
- **Categories on day one.** At this volume they become a place to file things
  wrongly. Search does the job; add tags when there is a pile to tidy.
- **AI-generated answers.** The value is *you* and people a quarter ahead of
  each other. Revisit only if you want a "suggested similar questions" helper.

## 8. Risks

- **You are the product.** If answers depend on one person, a week away is a
  week of silence. The 24-hour unanswered alert (1.9) and the "learn from the
  room" framing are the mitigations; the real one is a second answerer.
- **Notifications are a deliverability risk.** A bad week of spam complaints on
  `notify.` would put sign-in links in junk. Hence: transactional only, honest
  unsubscribe, and DMARC in Phase 0.
- **Merge debt.** Three other branches, one of them large and carrying a migration, all touching the same migration list. Every
  week of delay makes 0.3 harder.

## 9. Suggested order

| When | What |
| --- | --- |
| **This week** | 0.1, 0.2, 0.5, 0.6 — small, safe, ship individually. You: 0.7 |
| **Next** | 0.3, 0.4, then 1.1 and 1.2 — notifications and the member home, the two changes members will actually feel |
| **After** | 1.3–1.5, then 1.6–1.9 |
| **Then** | Phase 2 once the webhook question is answered; Phase 3 in parallel with it |
| **Continuously** | 4.1 (CI) should land early — it is the thing that makes the rest safe to do quickly |

Total: roughly **30–35 working days** across all phases, with Phases 0 and 1
(about 15) being the ones that change what a member feels.
