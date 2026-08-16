# MirrorMoment

MirrorMoment is a mobile-first occasion-confidence experience for the YouCam
API Skin AI & Apparel VTO Hackathon. A shopper defines the moment they are
preparing for, compares three YouCam Apparel VTO looks, optionally adds
non-medical cosmetic context from YouCam Skin Analysis, and downloads one
Confidence Plan.

Public source repository: [Siddhant75/MirrorMoment](https://github.com/Siddhant75/MirrorMoment)

The default runtime is a transparent, key-free **Recorded Judge Replay** built
from successful YouCam outputs for one fictional synthetic subject. An explicit
**Live YouCam** mode accepts new consented images and calls the real APIs. Live
failures never fall back to replay results.

## Problem and consumer value

Shoppers preparing for an interview, wedding, date, or personal reset often
make apparel and beauty decisions in separate tools. MirrorMoment turns those
decisions into one guided moment: state the occasion and preferences, compare
three visual outfit options, optionally add non-medical cosmetic context, and
save one transparent plan. For a retailer or concierge, the same journey can
connect occasion discovery, curated merchandise, and consent-led beauty
personalization without claiming garment fit or diagnosing skin.

## What works today

- Occasion, style, formality, and budget preferences drive a deterministic
  three-look recommendation set from a fictional catalog.
- A consented full-body image powers exactly three AI Clothes V3 tasks; an
  optional separate face image powers Skin Analysis v2.1.
- Independent progress and failure states preserve completed looks and allow a
  single failed VTO task to be retried without restarting the plan.
- The selected VTO, recommendation rationale, optional cosmetic context,
  safety copy, and fictional cart summary become a downloadable Confidence
  Plan generated in the browser.
- A truthful recorded replay gives judges a complete key-free path, while live
  mode exercises the same application routes with fresh YouCam tasks.

## Built with

Next.js App Router, React, TypeScript, Tailwind CSS, Zod, Vitest, Testing
Library, Playwright, YouCam Skin Analysis v2.1, and YouCam AI Clothes V3.

## Requirements

- Windows 10/11
- Node.js 20 or newer
- npm
- A YouCam API key only for optional live mode

Install the pinned dependencies once:

```powershell
npm.cmd ci
```

## Recommended: key-free judge replay

```powershell
npm.cmd run demo:replay
```

Wait for `MirrorMoment is ready at http://127.0.0.1:3000`, then open that URL
manually. Replay mode clears the key from the application process, accepts only
the bundled synthetic face/body files, makes no YouCam network calls, and
reproduces queued, processing, comparison, selection, retry, download, and
clear-session behavior.

The replay badge and fixed profile are intentional: they keep the displayed
inputs, recommendations, Skin result, and VTO images truthfully paired with the
recorded API run.

## Optional: live YouCam mode

Copy `.env.example` to `.env.local` and add the key locally:

```dotenv
YOUCAM_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add the key after the first equals sign in your ignored `.env.local`. Do not
paste it into source code, a `NEXT_PUBLIC_` variable, GitHub, demo
screenshots, or terminal recordings. Start the attached live production app:

```powershell
npm.cmd run demo:live
```

Live mode is visibly labeled **Live YouCam**, accepts JPEG/PNG shopper photos
under 8 MiB, and uses the same upload -> task -> poll -> result application
routes as the replay. The launcher reports only whether the key is configured.

If Node reports `UNABLE_TO_VERIFY_LEAF_SIGNATURE` on a machine where antivirus
or an enterprise proxy inspects HTTPS, never disable TLS verification. Add the
locally trusted public root to that one Node process with
`NODE_EXTRA_CA_CERTS`; do not commit the certificate or treat it as a portable
project setting.

## YouCam integration and architecture

| Integration | Role in the shopper journey | Browser-visible result |
| --- | --- | --- |
| Skin Analysis v2.1 | Optional, consent-led cosmetic context for the selected plan | One normalized cosmetic label and score |
| AI Clothes V3 | Three virtual outfit previews using the shopper body image and curated garment references | Independent VTO status and completed preview URL |

The browser calls validated Next.js API routes for uploads, plan creation,
status polling, and individual look retry. A server-only provider boundary
selects either the recorded replay or live YouCam implementation. In live mode,
the server initializes presigned uploads, creates asynchronous tasks, polls
vendor state, normalizes errors, and returns only the fields the interface
needs; `YOUCAM_API_KEY` never enters the client bundle.

## Runtime boundaries

| Mode | New shopper photos | YouCam calls | Credential | Result provenance |
| --- | --- | --- | --- | --- |
| Recorded Judge Replay | Bundled synthetic pair only | None | Not required | Recorded successful Skin/VTO outputs |
| Live YouCam | Valid consented JPEG/PNG files | Skin Analysis v2.1 and AI Clothes V3 | Server-only key required | Fresh vendor task results |

- The server owns runtime selection, YouCam authorization, catalog-reference
  uploads, task creation, polling, and error normalization.
- The browser receives no API key or raw Skin payload. It keeps only profile
  choices, task references, and completed result URLs in `sessionStorage`.
- Exactly three Apparel VTO tasks are created per plan. Individual retry starts
  only the failed look and preserves successful results.
- Skin personalization is optional cosmetic context. MirrorMoment makes no
  diagnosis, treatment, sizing, fit-guarantee, or return-reduction claim.
- Clear session removes browser-held MirrorMoment data only; it does not claim
  to delete vendor-managed data.

## Tests and release gates

```powershell
npm.cmd run lint
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run package:judge
```

The Playwright suite forces replay mode with an empty key. It proves both the
full Skin + three-look journey and the explicit no-Skin fallback against the
production build.

## Optional Devpost judge ZIP

```powershell
npm.cmd run package:judge
```

This creates the ignored file
`release/MirrorMoment-Judge-Demo.zip`. The builder stages an explicit allowlist,
rejects credentials, private keys, signed URLs, private inputs, raw vendor
responses, and agent context, writes `SHA256SUMS.txt`, and enforces a 34 MiB
safety ceiling below Devpost's 35 MB upload limit. The package runs locally on
Node 20 and does not require a paid host.

The ZIP is optional: the live Devpost requirements report that a video is
required, while a website and ZIP are not required. It is included as a useful
offline judge path, not as a substitute for the repository, screenshots, or
video.

## Recording and screenshots

The user records the demo manually in OBS; no project script opens or controls
a browser or OBS. Follow [docs/OBS_DEMO_GUIDE.md](docs/OBS_DEMO_GUIDE.md) for the
2:55 narration and capture:

1. locked selection profile and replay badge;
2. synthetic image choices and consent;
3. queued/processing generation states;
4. three completed look comparisons; and
5. the final Confidence Plan with Radiance 85/100, safety copy, fictional cart,
   and download control.

## Current Devpost submission requirements

Refreshed from the YouCam Devpost connector on 2026-08-16:

- provide a functional code repository with source, assets, and instructions;
- keep a public repository under relevant licensing, or make it private and
  share it with `contact_event@PerfectCorp.com` before judging;
- provide a product/value description and screenshots;
- provide a public 1-3 minute YouTube, Vimeo, or Youku demo that shows the app
  functioning and explains the YouCam APIs;
- do not use unlicensed music, copyrighted material, or unrelated third-party
  trademarks; and
- complete the required submitter, project-status/start-date, API-surprise,
  novel-use-case, and technical-obstacle questions.

The [official submission requirements](https://youcam-api.devpost.com/details/requirements)
and [official rules](https://youcam-api.devpost.com/rules) remain the source of
truth if this summary ever differs from Devpost.

The source repository is public at
[github.com/Siddhant75/MirrorMoment](https://github.com/Siddhant75/MirrorMoment),
and its application source code is MIT-licensed, so judges can inspect, run,
and test the implementation directly. If the repository is made private again
before judging, invite the required judge email listed in the event
instructions.

## Known limitations

- VTO outputs are visual previews, not measurements, sizing advice, fit
  assessments, or purchase guarantees.
- Skin Analysis contributes optional cosmetic context only; it is not medical
  advice and does not determine apparel recommendations.
- The catalog and cart are intentionally small and fictional; MirrorMoment has
  no retailer inventory, checkout, accounts, analytics, or persistent database.
- Recorded replay is locked to its bundled synthetic subject and preference
  profile. Live mode requires a valid YouCam key, supported inputs, network
  access, and available vendor services.
- Clear session removes browser-held MirrorMoment state only and makes no claim
  about deleting data managed by an external API provider.

## Repository safety and assets

- `.env.example` is the only tracked environment template; populated variants
  stay ignored.
- `private-demo-images/`, `release/`, local plans/specs, certificates, logs,
  generated media, and agent context are ignored.
- Public catalog and replay files are fictional, synthetic, and unbranded.
  Provenance is recorded in
  [docs/ASSET_ATTRIBUTION.md](docs/ASSET_ATTRIBUTION.md).
- Live evidence and API details are documented in
  [docs/API_NOTES.md](docs/API_NOTES.md); submission-answer drafts are in
  [docs/SUBMISSION_NOTES.md](docs/SUBMISSION_NOTES.md).

Before sharing or pushing, audit the tracked scope:

```powershell
git ls-files ".env*" "private-demo-images/**" "release/**" ".local-plans/**" "docs/JUDGE_DEMO_RELEASE.md"
git diff --check
```

The first command should list `.env.example` and no private inputs or local
planning files.

## License and third-party boundaries

MirrorMoment's application source code, tests, scripts, and project-authored
documentation are available under the [MIT License](LICENSE).

The MIT License does not grant rights to Perfect Corp.'s YouCam APIs, services,
names, or trademarks. Recorded YouCam outputs and all use of the live API remain
subject to the applicable Perfect Corp. terms. Bundled media provenance and
usage boundaries are documented in
[docs/ASSET_ATTRIBUTION.md](docs/ASSET_ATTRIBUTION.md); no third-party retailer
photography, logos, or campaign material is included.
