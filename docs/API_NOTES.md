# YouCam API integration notes

MirrorMoment uses the documented asynchronous upload → task → poll pattern:

- Skin Analysis v2.1: `/s2s/v2.1/file/skin-analysis`, `/s2s/v2.1/task/skin-analysis`, and task polling.
- AI Clothes V3: `/s2s/v2.0/file/cloth-v3`, `/s2s/v2.0/task/cloth-v3`, and task polling.

Before recording the submission, repeat the successful flow on Railway and
validate from a clean browser session:

1. accepted face-image framing and selected cosmetic fields;
2. accepted full-body/reference-garment image requirements;
3. response shape for the enabled Skin Analysis fields;
4. average task latency and a failed-task response; and
5. that the project API key has access to both capabilities.

Record the results below with no secrets or personally identifiable images.

| Check | Result | Date |
| --- | --- | --- |
| Skin Analysis fields | Live task succeeded; `radiance` normalized to a cosmetic score of 84 from the synthetic face fixture | 2026-08-07 |
| AI Clothes V3 task | Three distinct interview looks succeeded and returned downloadable result images | 2026-08-07 |
| Failure/retry case | Not forced against the paid API because all three looks succeeded; isolated retry remains covered by route/component tests | 2026-08-07 |

## Live local validation completed on 2026-08-07

The production Next.js server was exercised through its public application
routes rather than by calling the client module directly. The run used two
original, synthetic ImageGen fixtures kept under the ignored
`private-demo-images/` directory:

- face input: PNG, 1023 x 1537, 1,968,952 bytes, centered and unobstructed;
- body input: PNG, 1024 x 1536, 1,957,939 bytes, straight-on with the complete
  silhouette, hands, and feet visible.

Observed flow and evidence:

1. Clothes and Skin file initialization plus presigned uploads succeeded.
2. One Skin Analysis task and exactly three AI Clothes V3 tasks started.
3. Skin completed first; the app exposed only the normalized cosmetic result
   `{ label: "radiance", score: 84 }`.
4. Navy Tailoring, Cocoa Blazer Set, and Graphite Set all completed
   successfully. Each result was 1024 x 1536 and downloaded for visual QA.
5. The command's total wall time was 38 seconds, including local server
   startup, five source/reference uploads, task creation, polling, and result
   downloads.
6. Visual QA found coherent identity, pose, hands, feet, background, garment
   color, jacket structure, and trouser silhouette across all three outputs.

The live fixtures and signed result URLs are not committed. These results are
technical VTO previews, not sizing or fit assessments.

### Local TLS obstacle

Node.js 22.14 initially failed before authentication with
`UNABLE_TO_VERIFY_LEAF_SIGNATURE`, while Windows curl trusted the same host.
The machine's HTTPS traffic was being inspected by Avast Web/Mail Shield.
For the local smoke process only, its public root certificate was exported
from the Windows trust store into the ignored demo directory and passed to
Node through `NODE_EXTRA_CA_CERTS`. TLS verification was never disabled. This
machine-specific setting must not be copied to Railway.

## Official-reference checks completed on 2026-08-07

These documentation checks now have a matching successful local live run:

- File initialization includes `file_name`, `content_type`, and `file_size`.
- The upload destination and required headers are read from the first entry in
  the file response's nested `requests` array.
- Skin Analysis v2.1 is created with `src_file_id`, the supported SD cosmetic
  actions `moisture`, `radiance`, and `texture`, and `format: "json"`.
- The documented JSON result shape is `data.results.output[]`, with `type`,
  `ui_score`, `raw_score`, and optional mask URLs. MirrorMoment retains only a
  small normalized cosmetic label and UI score in the browser response.
- AI Clothes V3 uses `src_file_id`, `ref_file_id`, and
  `garment_category: "full_body"`.

References:

- https://docs.perfectcorp.com/reference/ai_skin_analysis/v2.1
- https://docs.perfectcorp.com/reference/ai_clothes/section/overview
