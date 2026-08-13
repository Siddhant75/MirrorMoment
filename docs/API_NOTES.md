# YouCam API integration notes

MirrorMoment uses the documented asynchronous upload -> task -> poll -> result
pattern through server-only Next.js routes.

- Skin Analysis v2.1: `/s2s/v2.1/file/skin-analysis`,
  `/s2s/v2.1/task/skin-analysis`, and task polling.
- AI Clothes V3: `/s2s/v2.0/file/cloth-v3`,
  `/s2s/v2.0/task/cloth-v3`, and task polling.

The browser never receives the API key or raw Skin Analysis payload. The server
normalizes vendor states to `queued`, `processing`, `succeeded`, or `failed` and
exposes only a small cosmetic label/score for a successful Skin task.

## Current validation matrix

| Check | Verified result | Date |
| --- | --- | --- |
| Initial full live route run | One Skin task plus exactly three AI Clothes V3 tasks succeeded in 38 seconds | 2026-08-07 |
| Initial Skin normalization | Original synthetic face returned `radiance: 84` | 2026-08-07 |
| Matched-subject Skin task | Tightly framed face of the VTO subject returned `radiance: 85` | 2026-08-13 |
| Recorded replay | Exact bundled face/body hashes produce one Skin result and three local VTO result paths; no network call | 2026-08-13 |
| Extracted judge package | Key-free HTTP smoke passed runtime, upload, plan, status, and retry routes | 2026-08-13 |
| Post-provider-refactor full live route run | Matched Skin plus three distinct fresh VTO results succeeded; no replay fallback | 2026-08-13 |

## Live production-route validation completed on 2026-08-07

The production Next.js server was exercised through the public application
routes, not by calling the YouCam client directly. The run used original
fictional synthetic fixtures kept under ignored `private-demo-images/`:

- face input: PNG, 1023 x 1537, 1,968,952 bytes, centered and unobstructed;
- body input: PNG, 1024 x 1536, 1,957,939 bytes, straight-on with the complete
  silhouette, hands, and feet visible.

Observed flow:

1. Clothes and Skin file initialization plus presigned uploads succeeded.
2. One Skin Analysis task and exactly three AI Clothes V3 tasks started.
3. Skin completed first; the app returned only
   `{ label: "radiance", score: 84 }`.
4. Navy Tailoring, Cocoa Blazer Set, and Graphite Set all succeeded. Each VTO
   result was 1024 x 1536 and downloaded only into the ignored private folder.
5. Total wall time was 38 seconds, including local server startup, five
   source/reference uploads, task creation, polling, and result downloads.
6. Visual QA found coherent identity, pose, hands, feet, background, garment
   color, jacket structure, and trouser silhouette across the three previews.

The signed result URLs and downloaded live results are not committed. These are
visual VTO previews, not sizing or fit assessments.

## Matched-subject Skin validation completed on 2026-08-13

The offline replay shows the same fictional synthetic person in its face and
full-body inputs. Two initial head-and-shoulders drafts reached task processing
but returned `error_src_face_too_small`. The vendor response, not visual
guesswork, guided the correction.

The official Skin Analysis guidance says the detected facial oval, excluding
hair and the full head, should occupy more than 60% of image width. A tighter,
front-facing, neutral, closed-mouth image then uploaded and completed Skin
Analysis v2.1 with `{ label: "radiance", score: 85 }`.

Only the normalized label and score are bundled. The API key, vendor task ID,
raw result, upload URL, and signed result URL are absent from replay assets.

## Recorded replay behavior

Replay is an explicit provider, not a mocked client hidden behind live UI:

- runtime badge: **Recorded Judge Replay**;
- accepted inputs: exact SHA-256 matches for the bundled synthetic face/body;
- task progression: queued for the first second, processing until four seconds,
  then succeeded;
- Skin output: `radiance: 85`;
- VTO outputs: three local `/replay/*.jpg` paths;
- network behavior: the replay provider never calls `fetch`;
- profile: fixed interview/classic/polished/mid scenario so inputs and outputs
  remain truthfully paired.

Sessions are versioned by runtime mode. A live session is not restored in
replay and vice versa. Source image bytes and blob/data URLs are never written
to session storage.

## Extracted judge-package smoke completed on 2026-08-13

The standalone ZIP was extracted into a fresh ignored directory and started
with `MIRRORMOMENT_MODE=replay` while `YOUCAM_API_KEY` was absent. PowerShell and
HTTP only were used; no browser was opened or controlled.

The smoke verified:

1. `/api/runtime` reported replay;
2. `/api/uploads` accepted the bundled face and body;
3. `/api/plan-jobs` created one Skin task and exactly three look tasks;
4. `/api/plan-jobs/status` returned `radiance 85` and the three expected local
   result paths; and
5. `/api/look-tasks` created one replacement Navy Tailoring task.

The package policy scans staged paths and text for environment files,
credentials, private keys, signed URLs, agent context, raw vendor responses,
and private fixture paths before compression.

## Post-provider-refactor live route smoke completed on 2026-08-13

After the replay/live provider refactor and standalone release changes, the
current production build was started with process-local
`MIRRORMOMENT_MODE=live`. The ignored matched face and synthetic full-body
inputs were uploaded through `/api/uploads`.

Verified observations:

1. The body and matched face uploads both succeeded.
2. `/api/plan-jobs` created one Skin task and exactly three Clothes tasks.
3. Skin succeeded first with normalized `radiance: 85`.
4. Graphite Set, Navy Tailoring, and Cocoa Blazer Set then reached success
   independently, demonstrating the real per-task polling path.
5. The three result URLs were distinct absolute vendor URLs; none used a local
   `/replay/` path, so live mode did not silently fall back.
6. The Confidence Plan payload contained the expected three interview outfits.
7. The three downloaded evidence images were 158,886, 131,775, and 146,105
   bytes and remained under ignored `private-demo-images/`.
8. Total command wall time was 77.2 seconds, including server readiness,
   uploads, reference uploads, task creation, polling, and result downloads.

The script printed only normalized states, labels, scores, result booleans, and
local evidence sizes. It did not print the API key, task IDs, signed URLs, or
raw vendor payloads.

## Local TLS obstacle and secure workaround

Node.js 22.14 initially failed before authentication with
`UNABLE_TO_VERIFY_LEAF_SIGNATURE`, while Windows curl trusted the same host.
Avast Web/Mail Shield was inserting a locally trusted certificate.

For the affected local smoke process only, the public Avast root certificate
was exported from the Windows trust store into the ignored private directory
and supplied with `NODE_EXTRA_CA_CERTS`. TLS verification was never disabled.
This is a machine trust setting, not a project asset or a setting judges should
copy unless their own verified trust chain requires it.

## Official-reference contract checks

- File initialization sends `file_name`, `content_type`, and `file_size`.
- The presigned destination and headers come from the first entry in the nested
  `requests` array.
- Skin v2.1 uses `src_file_id`, cosmetic actions `moisture`, `radiance`, and
  `texture`, plus `format: "json"`.
- Skin JSON results are read from `data.results.output[]` using `type` and
  `ui_score`; masks and raw scores are not exposed to the browser.
- AI Clothes V3 uses `src_file_id`, `ref_file_id`, and
  `garment_category: "full_body"`.

References:

- https://docs.perfectcorp.com/reference/ai_skin_analysis/v2.1
- https://docs.perfectcorp.com/reference/ai_clothes/section/overview
