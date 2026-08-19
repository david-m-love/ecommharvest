# eCommHarvest — Q4 Masterclass

Landing page and registration backend for a free 90-minute masterclass: *Your Q4
Revenue Playbook, Built in 90 Minutes.* Thursday, September 3, 2026 at 11:00 AM
MT. Aimed at LDS e-commerce founders. Presented by David Love with special guest
Derek Crimin (owner of B.O.M.Socks), hosted by Tiny 3D Temples, B.O.M.Socks, and
Come Follow Me FHE.

## Structure

```
public/
  index.html        Landing page + registration form
  thanks.html       Post-registration confirmation, calendar links (noindex)
  privacy.html      Privacy policy (DRAFT — needs legal review)
  terms.html        Terms & conditions (DRAFT — needs legal review)
  styles.css        Shared stylesheet for all four pages
  logo.png          eCommHarvest wordmark
  masterclass.ics   Calendar file for the event
  logos/            Host logos go here (see docs/logos.md)
api/
  register.js       POST — validates and fans a registration out to every sink
  registrations.js  GET  — CSV export, bearer-token protected
test/
  register.test.js       14 tests
  registrations.test.js  11 tests
  devserver.js           Local server that runs the API in-process
vercel.json         Static config, function limits, cache + security headers
```

No build step. `public/` is served as-is; `api/` runs as Node serverless
functions. Zero dependencies — the functions use global `fetch`. Only external
runtime dependency is Google Fonts.

Page order on the landing page: hero → hosted-by trust bar → faith-first
positioning → what you'll learn → paid social / CAC → who this is for →
speakers → registration form.

## Local development

```bash
npm run dev      # static only, no API
npm run dev:api  # serves public/ and runs the API handlers in-process, port 4322
npm test         # 25 tests, no network required
```

`dev:api` reads the same environment variables as production, so you can point
it at a real sink:

```bash
REGISTRATION_WEBHOOK_URL=https://webhook.site/<your-id> npm run dev:api
```

## Environment variables

`POST /api/register` writes to **every** sink that is configured, and returns
`503` if none are — a registration is never accepted into a void. Configure at
least one.

| Variable | Required | Purpose |
| --- | --- | --- |
| `KV_REST_API_URL` | — | Vercel KV / Upstash Redis REST endpoint. Enables durable storage, the CSV export, and per-IP rate limiting. |
| `KV_REST_API_TOKEN` | — | Token for the above. Both are set automatically when you attach a KV store in Vercel. |
| `KLAVIYO_PRIVATE_KEY` | — | Klaviyo private API key (`pk_…`). Subscribes each registrant to a list. |
| `KLAVIYO_LIST_ID` | — | Klaviyo list ID to subscribe to. Needed alongside the key. |
| `REGISTRATION_WEBHOOK_URL` | — | Any URL that accepts a JSON POST — Zapier, Make, n8n. Useful as a belt-and-braces copy. |
| `ADMIN_TOKEN` | — | Enables `GET /api/registrations`. Without it that endpoint always returns 401. |

Set them in Vercel under Project → Settings → Environment Variables, then
redeploy.

### Exporting registrations

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://<your-domain>/api/registrations > registrations.csv
```

Requires KV (that's where rows are stored). Returns 404 if KV is unconfigured,
so the endpoint doesn't advertise itself on a site that isn't using it.

### Spam handling

Three layers, no CAPTCHA: a honeypot `company` field, a minimum fill time of
2.5s, and a per-IP limit of 8 submissions per hour (KV only). Suspected bots
receive a normal-looking success response but are never stored.

## Deploy

Vercel, no build command, output directory `public`. `api/` is detected
automatically.

```bash
vercel deploy --prod
```

Or connect the repo in the Vercel dashboard — `vercel.json` is picked up
automatically.

## Open items

1. **Legal review.** `privacy.html` and `terms.html` are drafts and say so on the
   page. Both contain `[bracketed]` placeholders for the legal entity name,
   address, contact addresses, retention period, liability cap, and governing
   law. The privacy policy also has an explicit either/or to resolve: whether
   the three host brands receive registrant details. Pick one, delete the other
   — this has to match what you actually do.
2. **Klaviyo schema.** The subscribe call is pinned to API revision
   `2024-10-15`. It could not be verified against live docs from the build
   environment, so send one test registration and confirm the profile lands on
   the list before promoting the page.
3. **Webinar platform.** Nothing here creates a Zoom/Demio registration or
   issues a real join link — the confirmation email has to carry it. If the
   platform needs registrants pushed into it, that's a fourth sink in
   `api/register.js`, alongside the Klaviyo one.
4. **Host logos** — three `.host-mark` monogram placeholders. See
   `docs/logos.md`.
5. **Speaker photos and bios** — `.sp-photo` holds `DL` / `DC` monograms. Both
   bios are drafts written from approach rather than credentials. Confirm
   Derek's with him.
6. **Analytics / ad pixel.** None installed. If a Meta pixel goes on for the ad
   campaign, the privacy policy's tracking section must be updated to name it,
   and it should be consent-gated for UK/EU visitors.
