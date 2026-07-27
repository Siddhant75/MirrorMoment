# YouCam API integration notes

MirrorMoment uses the documented asynchronous upload → task → poll pattern:

- Skin Analysis v2.1: `/s2s/v2.1/file/skin-analysis`, `/s2s/v2.1/task/skin-analysis`, and task polling.
- AI Clothes V3: `/s2s/v2.0/file/cloth-v3`, `/s2s/v2.0/task/cloth-v3`, and task polling.

Before recording the submission, validate in the YouCam API Playground:

1. accepted face-image framing and selected cosmetic fields;
2. accepted full-body/reference-garment image requirements;
3. response shape for the enabled Skin Analysis fields;
4. average task latency and a failed-task response; and
5. that the project API key has access to both capabilities.

Record the results below with no secrets or personally identifiable images.

| Check | Result | Date |
| --- | --- | --- |
| Skin Analysis fields | Not yet run | |
| AI Clothes V3 task | Not yet run | |
| Failure/retry case | Not yet run | |
