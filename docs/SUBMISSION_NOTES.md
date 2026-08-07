# Devpost submission notes

Use this file to capture specific evidence during testing for the required Devpost custom answers.

## API surprise

The positive surprise was how well one asynchronous decision journey could
coordinate two different AI products. In the live run, Skin Analysis finished
first and MirrorMoment kept polling all three Clothes tasks independently.
All three VTO results preserved the synthetic shopper's identity and pose while
rendering visibly different colors, jacket structures, and trouser silhouettes.
The entire local production-route run completed in 38 seconds, including
uploads and result downloads.

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

The first live attempt then exposed an environment-specific TLS wall before
the API received any authenticated request: Node.js 22.14 could not validate
the certificate inserted by Avast Web/Mail Shield, although Windows curl could.
We confirmed the cause with a no-key red/green connectivity test. The secure
workaround exported Avast's public root from the Windows trust store and passed
it only to the local Node process through `NODE_EXTRA_CA_CERTS`; we never
disabled TLS verification. After that correction, both uploads, Skin Analysis,
and all three Clothes tasks succeeded. Railway should use its normal CA store
without this machine-specific setting.

The remaining evidence step is to repeat the flow on Railway and capture the
five submission screenshots from a clean browser session.
