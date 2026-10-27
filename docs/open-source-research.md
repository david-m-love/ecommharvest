# Open source worth learning from — forums, memberships and courses

*27 October 2026. Researched before the experience plan is acted on, because the
answer changes it.*

## How much to trust this

Stars, licences and test setups below were read **from each project's own GitHub
page today**, not from roundup articles — the roundups were mostly affiliate
listicles with no numbers. Three limits you should know:

- **"Well tested" means a test suite and CI are visibly there** (a `test` folder,
  a CI badge, a coverage badge). It does **not** mean I measured coverage or saw
  the builds pass. The pages don't show either.
- GitHub's pages did not show **last-commit dates**, so "actively maintained" is
  inferred from star counts and the presence of CI, not confirmed.
- Several documentation sites (payloadcms.com, meta.discourse.org, answer.apache.org,
  forum.ghost.org) were unreachable from this environment. Where a claim rests on a
  search summary rather than a page I read, I say so.

Not legal advice. Licensing notes are my reading, for your lawyer to confirm.

---

## 1. The shortlist

| Project | What it is | Stars | Licence | Tests / CI visible | Can we copy code? |
| --- | --- | --- | --- | --- | --- |
| **[Discourse](https://github.com/discourse/discourse)** | Forum. The reference implementation | 48.0k | GPL-2.0 | `spec/`, `test/`, CI badge | **Ideas only** |
| **[Ghost](https://github.com/TryGhost/Ghost)** | Publishing + **paid memberships + newsletters** | 55.6k | MIT | vitest, `e2e/`, CI badge | **Yes** |
| **[Payload](https://github.com/payloadcms/payload)** | Our own framework | 45.5k | MIT | `test/`, vitest, CI | Yes |
| **[Novu](https://github.com/novuhq/novu)** | Notification infrastructure: digests, preferences, in-app inbox | 40.2k | MIT, **with an `enterprise/` folder under a commercial licence** | jest, CI | Yes, except `enterprise/` |
| **[Apache Answer](https://github.com/apache/answer)** | Q&A platform | 15.7k | Apache-2.0 | CI; no test folder listed | Yes |
| **[NodeBB](https://github.com/NodeBB/NodeBB)** | Real-time forum (Node) | 15.2k | GPL-3.0 | `test/`, CI, **coverage badge** | Ideas only |
| **[Flarum](https://github.com/flarum/framework)** | Lightweight forum (PHP) | 6.8k | MIT | Backend tests CI | Yes |
| **[Frappe LMS](https://github.com/frappe/lms)** | Course platform | 3.4k | **AGPL-3.0** | Tests badge, codecov, Playwright | **Ideas only** |
| **[LearnHouse](https://github.com/learnhouse/learnhouse)** | Next.js + FastAPI course platform with forums | 2.4k | **AGPL-3.0**, enterprise features separately licensed | codecov, API-coverage badge | **Ideas only** |
| **[Talkyard](https://github.com/debiki/talkyard)** | Q&A + chat + comments | 1.8k | AGPL-3.0 | `tests/` | Ideas only |
| **[ClassroomIO](https://github.com/classroomio/classroomio)** | SvelteKit course platform | 1.7k | AGPL-3.0 | `e2e/` | Ideas only |
| **[CourseLit](https://github.com/codelitdev/courselit)** | Courses + digital downloads, Stripe | 1.3k | AGPL-3.0 | jest, CI | Ideas only |
| **[Storyden](https://github.com/Southclaws/storyden)** | Forum/knowledge base | 343 | MPL-2.0 | `tests/`, CI | Yes (file-level copyleft) |

**Looked at and set aside:** Moodle (GPL-3.0), Open edX (AGPL-3.0) and Canvas
(AGPL-3.0) — institutional-scale systems, nothing to lift into a coaching
membership. I did not inspect them.

## 2. What the research actually says

### 2.1 There is no TypeScript forum worth adopting

The proven forums are Ruby, PHP, Node and Go. The TypeScript/Next.js ones are
small and unproven — the top TypeScript results for "forum" are 3.5k stars and
under, and most are hobby projects ("a Hacker News-style forum built with Clean
Architecture", a "campus confession wall"). **Nothing here is both well-ranked and
in our stack, so nothing can be dropped in.** What we can do is borrow designs,
and the designs worth borrowing are very good.

### 2.2 The licence map decides what "borrow" means

- **MIT / Apache-2.0** (Ghost, Payload, Flarum, Answer, Novu core): code may be
  reused with attribution.
- **GPL / AGPL** (Discourse, NodeBB, Frappe LMS, LearnHouse, ClassroomIO, CourseLit,
  Talkyard): **read them, learn from them, do not paste from them.** AGPL in
  particular reaches code that is merely *served over a network*, which is exactly
  what a website is. Ideas and data models are free; copied source is not.

That rule rules out most of the course platforms as code sources, and it is fine:
what we want from them is their design.

### 2.3 The one real fork: build on our stack, or run Discourse beside it

Discourse is the most battle-tested thing on this list by a wide margin, and it
has what Phase 1 of the plan spends ~12–14 days building: notifications, digests,
search, image uploads, flags and moderation, an editor, mobile apps.

It can sit behind our own sign-in: its official single sign-on (DiscourseConnect)
matches a user by an external ID, then by email, can create accounts on first
login, and **lets our site control group membership** — so our entitlement table
could decide who is in the room. *(From Discourse's own setup guide as surfaced by
search; I could not open it.)*

| | **Keep building it ourselves** | **Discourse behind our sign-in** |
| --- | --- | --- |
| Feel | One product, one look, one login | Two products that share a login; it will look like Discourse |
| Features | Only what we build and maintain | Years of moderation, search and email tuning |
| Effort | Plan's Phase 1: ~12–14 days, then ongoing | SSO and group sync: a few days, then styling |
| Running cost | Nothing new | A second system to host and keep patched. One roundup estimates ~2 vCPU / 4 GB RAM for production installs of these self-hosted forums — I have not priced hosting |
| Your data | One database | Posts live in Discourse's database, members in ours |
| Fit for you | A small, private, coach-led room | Built for communities far larger than yours |
| Licence | Ours | GPL-2.0, but run unmodified so it does not touch our code |

**My read:** for a 50–500 member room led by one person, building is still
reasonable *if* you accept it is a product you maintain — and the research makes
Phase 1 cheaper and better-designed, because the hard parts have known answers
(§3). Discourse is the right answer if the thing you want is **to stop thinking
about forum software**. That is a values question, not a technical one, so it goes
to you in §5.

## 3. Ideas worth taking, by what they would change

### 3.1 Ghost: a one-time code beside the magic link

Ghost added **one-time codes** so a member gets a link *and* a code in the same
email and uses whichever works. Its stated reason: magic links are awkward on
mobile, where in-app browsers don't behave. *(Ghost's changelog and sign-in help,
via search.)* Mail-security scanners that open links are a documented way a
single-use link gets spent before the human clicks — **that part is from a
Supabase write-up, not from Ghost**, and I'm inferring Ghost's codes also help.

We already fixed the scanner problem with the confirm page. A code adds what that
does not: **requesting on a laptop and reading the email on a phone**, which we
would otherwise lock out. It is small: a six-digit code stored hashed beside the
token, a box on the sign-in page, an attempt limit, a short expiry.

### 3.2 Discourse: four notification levels, and digests only for people who stopped coming

Verified from several community sources describing the product:

- **Watching** — every reply. **Tracking** — replies to you and @mentions, with a
  count. **Normal** — only replies to you and @mentions. **Muted** — nothing.
- **Normal** is the default for threads you haven't touched; posting in a thread
  moves it to **Tracking** (configurable).
- The **digest email goes only to people who haven't been around** for the digest
  period, and it picks from the *most popular* recent topics, not the newest.

That is the answer to the notification question in the plan: four levels per
thread, an automatic bump to Tracking when you reply, and a digest that exists to
**bring back people who drifted** — not to repeat what active members already saw.
It avoids the failure that kills small communities: an inbox full of everything.

### 3.3 Novu: preferences per kind of message

Novu's model — a subscriber has preferences *per workflow and per channel*, with
a digest step that batches events into one message — is the right shape for
our notification settings. **We should copy the data model, not run Novu**: I did
not evaluate its operational weight, and one table of preferences is all a room
this size needs. Its `enterprise/` folder is commercially licensed.

### 3.4 Search: use Postgres, and do *not* use Payload's search plugin as it ships

I unpacked `@payloadcms/plugin-search` and read it. Two findings:

- It writes to a **flat `search` collection** with a title, a priority and a link.
  There is **no full-text index and no ranking** anywhere in it.
- Its default access is **`read: () => true` — public.** Installed naively on a
  private community, every thread title would be readable by anyone at
  `/api/search`, bypassing the membership gate. It can be overridden; the default
  is the trap.

Postgres full-text search (a generated `tsvector` column, a GIN index, `ts_rank`)
gives real relevance ranking with no new service, and we already run Postgres.
Also: Payload pins plugins to its exact version — we are on 3.88.0, so it would be
the 3.88.0 build, not the current 3.92.0.

### 3.5 Frappe LMS: a map of what courses cost, if they come back

Its schema is **71 document types**. The ones that matter for a membership with
videos are small: `lms_course_progress`, `lms_video_watch_duration`,
`lms_lesson_note` (members' own notes on a lesson) and `lms_batch` (cohorts).
The other ~65 are coupons, programming exercises, Zoom settings and job-board
records. The lesson: **don't build a course platform; add the four small things
when courses are unhidden.** It also has no discussion or notification types of
its own — the forum and the course are separate concerns, as they are for us.

### 3.6 How the well-regarded projects test

Ghost has unit tests plus an `e2e/` folder and CI; NodeBB has a `test/` folder,
CI, and **a coverage badge and a Code Climate badge**; Frappe LMS has Playwright
and codecov. The common practice is **CI on every push with coverage visible**.
We have the tests and no CI — Phase 4.1 of the plan, and the cheapest item on it
to bring forward.

## 4. What I'd change in the experience plan

| Plan item | Change |
| --- | --- |
| 1.1 Notifications | Use Discourse's four levels and its digest rule (§3.2); copy Novu's preference *model* (§3.3) |
| 1.3 Search | Postgres full-text, **not** the Payload plugin (§3.4) |
| Phase 0 / 1 | Add a one-time code to the sign-in email (§3.1) |
| 4.1 CI | Bring forward; add visible coverage (§3.6) |
| Courses (Phase 5) | If unhidden: progress, watch time, lesson notes, cohorts — nothing else (§3.5) |
| **New decision** | Build vs Discourse behind SSO (§2.3) |
| **New rule** | GPL/AGPL projects are read-only references; MIT/Apache may be reused (§2.2) |

## 5. What I need from you

1. **Build it ourselves, or run Discourse behind our sign-in?** This changes about
   a third of Phase 1.
2. **Do you want the one-time code?** It is small and I'd do it regardless of (1).
3. **Do you accept the licence rule** — ideas from GPL/AGPL projects, code only
   from MIT/Apache — and want your lawyer to confirm it?

## 6. Not verified

- Whether **Apache Answer** supports accepted answers and voting. Its README
  doesn't say and I couldn't open its docs. I believe it does; I did not confirm it.
- **How Ghost decides access when a payment fails.** A forum answer on an old
  version says past-due members keep access during Stripe's retry period. That
  matches our "grant until period end" design but is weak evidence; GoHighLevel's
  behaviour is what matters, and that is still the open question for Phase 2.
- **Discourse's hosting cost,** and its exact digest defaults.
- Anything about **Better Auth** beyond its size (30.5k stars, MIT): its page did
  not show the features I looked for. It is a different auth stack from ours, so
  I would not adopt it.

## Sources

- Repositories as linked in the table (GitHub pages read 27 Oct 2026).
- [Discourse vs Flarum vs NodeBB, 2026](https://blog.elest.io/discourse-vs-flarum-vs-nodebb-which-self-hosted-forum-platform-in-2026/) and [10 best forum software, 2026](https://www.itechguides.com/10-best-forum-software-to-build-an-online-community-in-2026/) — positioning only.
- [Ghost one-time codes](https://alternativeto.net/news/2025/10/ghost-introduces-one-time-codes-for-flexible-member-sign-in/) and [Ghost member sign-in help](https://ghost.org/help/members-sign-in).
- [Discourse digest mechanics](https://meta.discourse.org/t/disable-suspend-digest-emails/24377) and [notification levels](https://westenberg.discourse.group/t/controlling-the-noise-in-your-feed/222).
- [DiscourseConnect setup](https://meta.discourse.org/t/official-single-sign-on-for-discourse/13045?tl=nl).
- [Ghost past-due access thread](https://forum.ghost.org/t/stripe-user-issue/21958).
- `@payloadcms/plugin-search` 3.92.0, unpacked from the npm registry and read directly.
