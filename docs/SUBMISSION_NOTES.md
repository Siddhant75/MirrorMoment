# Devpost submission notes

Use this file to capture specific evidence during testing for the required Devpost custom answers.

## API surprise

Record a concrete positive or frustrating observation from a real API Playground or app run.

## Under-discussed use case

MirrorMoment frames Skin AI and Apparel VTO as one “occasion confidence” decision for cross-category retail: the shopper plans how they want to feel for a moment, not two disconnected beauty and fashion transactions.

## Technical wall and workaround

During pre-live integration review, the first client implementation treated the
presigned upload request as a single object and omitted `file_size`; it also
sent Skin Analysis a generic `file_id`. The current YouCam references specify a
nested `requests[]` upload structure and a Skin v2.1 task body containing
`src_file_id`, `dst_actions`, and `format`. We converted the official examples
into mocked contract tests before correcting the client. This prevented an
invalid live run from consuming demo time and gave us a repeatable regression
suite. Relevant paths: `src/lib/youcam/client.ts`,
`src/lib/youcam/client.test.ts`, and
`src/app/api/plan-jobs/status/route.test.ts`.

Add the final live image-framing or vendor-error observation here after the API
Playground and Railway smoke tests.
