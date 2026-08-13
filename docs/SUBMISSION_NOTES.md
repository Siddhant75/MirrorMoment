# Devpost submission notes

Working evidence and paste-ready drafts for the YouCam API Skin AI & Apparel
VTO Hackathon. Verify every field once more in Devpost immediately before final
submission.

## Current submission inventory

Refreshed from the Devpost connector on 2026-08-13:

- Submitter type: **Individual**
- Country of residence: **India**
- App status: **New**
- Project start date: **07-27-26**
- Track/topic: **Skin AI + Apparel VTO**
- Repository: private `Siddhant75/MirrorMoment`; share with
  `contact_event@PerfectCorp.com` before judging
- Website: not required
- ZIP: not required; optional audited judge replay will be uploaded if useful
- Screenshots: five required project screenshots planned
- Video: required public 1-3 minute end-to-end demo; target 2:55, recorded
  manually by the user with OBS
- Social post URL: optional and currently not supplied

Do not claim the video or screenshots are complete until the user creates and
checks them. Do not submit or change repository visibility without explicit
user approval.

## Product description draft

MirrorMoment turns two disconnected retail tools into one occasion-confidence
decision. A shopper says what they are preparing for, chooses style, formality,
and budget, then compares three YouCam AI Clothes V3 virtual looks on one
full-body image. With explicit opt-in, YouCam Skin Analysis v2.1 adds a small
non-medical cosmetic signal to the selected look's beauty-prep explanation.

The value is not another API wrapper: MirrorMoment preserves partial results,
supports one-look retry, explains why each look was recommended, keeps Skin
personalization optional, and exports a single Confidence Plan with the chosen
VTO, rationale, cosmetic edit, safety copy, and fictional cart estimate. It
helps a first-time shopper move from "will this feel right for the moment?" to
an informed visual choice without making diagnosis, sizing, fit, or return
claims.

Judges can use the clearly labeled key-free recorded replay, which contains
successful API outputs for one fictional synthetic subject, or optional live
mode with their own YouCam key. The replay and live providers share the same
application routes and product UI, but live failures never fall back to
recorded results.

## Required custom answer: API surprise

The positive surprise was how naturally two asynchronous YouCam products could
support one decision instead of two widgets. In the full live route run, Skin
Analysis completed first while MirrorMoment continued polling three independent
Clothes tasks. All three VTO outputs preserved the synthetic shopper's identity
and pose while changing garment color, jacket structure, and trouser silhouette.
The complete production-route run took 38 seconds including uploads, task
creation, polling, and result downloads, which was fast enough to feel like one
guided retail moment while still requiring honest progress states.

The frustrating surprise was image framing precision. Two visually plausible
face crops returned `error_src_face_too_small`; the successful crop had to make
the detected facial oval exceed 60% of image width. That vendor feedback helped
us replace guesswork with explicit input guidance and a validated synthetic
replay subject.

## Required custom answer: under-discussed industry or use case

Perfect Corp.'s APIs could power cross-category "occasion readiness" services
for department stores, stylists, hospitality, career services, and luxury
concierge retail. A customer is rarely deciding about skin or apparel in
isolation; they are preparing for an interview, wedding, date, trip, or reset.
The under-discussed opportunity is a consent-led decision layer that combines
fashion visualization, optional cosmetic context, inventory, and a transparent
rationale into one saved plan while keeping health and fit claims out of scope.

## Required custom answer: technical wall and workaround

The first integration wall was contract accuracy. Presigned uploads use a
nested `requests[]` structure and require file size; Skin v2.1 expects
`src_file_id`, selected `dst_actions`, and JSON format. We converted the official
examples into mocked client and route tests before spending API calls, then
implemented one server-only provider boundary for file upload, task creation,
polling, and safe error normalization.

The second wall was local TLS interception. Node rejected the Avast-inserted
certificate before authentication even though Windows curl trusted it. We
diagnosed the trust-chain difference, exported only the local public root, and
provided it to the smoke process with `NODE_EXTRA_CA_CERTS`. We never disabled
TLS verification.

The third wall was a truthful offline judge experience. A generic mock would
hide whether the APIs had really worked, while a live-only demo could fail due
to credentials or network conditions. We recorded successful normalized API
results for one coherent synthetic subject, enforce exact input hashes, expose
a permanent **Recorded Judge Replay** badge, lock the scenario, simulate real
task states, and keep an explicit live mode that requires the key and never
falls back. The extracted standalone package then passed the same upload, plan,
status, and retry routes with no key.

## Verified technical evidence

- 2026-08-07: one Skin task and exactly three AI Clothes V3 tasks succeeded
  through production application routes in 38 seconds.
- 2026-08-13: matched-subject Skin task succeeded with normalized
  `radiance: 85`.
- 2026-08-13: replay tests prove exact-file validation, deterministic task
  states, zero replay-provider network calls, and no cross-mode session restore.
- 2026-08-13: production Playwright replay journeys passed with an empty API
  key, including the no-Skin fallback.
- 2026-08-13: standalone judge ZIP extracted and passed key-free HTTP smoke for
  runtime, two uploads, plan creation, terminal status, three local results,
  and one-look retry.
- 2026-08-13: post-refactor live route smoke returned `radiance: 85` and three
  distinct fresh VTO URLs in 77.2 seconds with no replay fallback.
- Final automated gate: lint and TypeScript passed; Vitest passed 77/77 tests
  across 20 files; the standalone production build passed; Playwright passed
  both key-free replay journeys.
- Final optional archive: standalone, 6,271,867 bytes, SHA-256
  `068a9f7651b9db4ddf8ec12c584d449dc59ef2e0c09d5d7d26cfb0a05d5da03a`.
  That exact ZIP passed the fresh extracted HTTP smoke.

## Video and screenshot truthfulness

- Keep the runtime badge visible.
- Say **recorded replay** when showing replay; never imply it is a fresh call.
- An honest **38 seconds later** edit may compress live waiting while showing
  real queued/processing states first.
- Explain both named integrations: Skin Analysis v2.1 and AI Clothes V3.
- Show the product functioning, partial-result recovery, selected plan, safety
  disclaimer, and download.
- Use no copyrighted music, unrelated third-party trademarks, real shopper
  images, or real catalog brands.
- Capture selection, consent/images, generation, comparison, and final plan.
