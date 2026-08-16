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

Refreshed from the YouCam Devpost connector on 2026-08-13:

- provide a functional code repository with source, assets, and instructions;
- if the repository remains private, share it with
  `contact_event@PerfectCorp.com` before judging;
- provide a product/value description and screenshots;
- provide a public 1-3 minute YouTube, Vimeo, or Youku demo that shows the app
  functioning and explains the YouCam APIs;
- do not use unlicensed music, copyrighted material, or unrelated third-party
  trademarks; and
- complete the required submitter, project-status/start-date, API-surprise,
  novel-use-case, and technical-obstacle questions.

The source repository is public at
[github.com/Siddhant75/MirrorMoment](https://github.com/Siddhant75/MirrorMoment),
so judges can inspect the implementation and setup instructions directly. If
the repository is made private again before judging, invite the required judge
email listed in the event instructions.

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
