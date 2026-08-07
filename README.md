# MirrorMoment

MirrorMoment is a mobile-first occasion-confidence demo for the YouCam API Skin AI & Apparel VTO Hackathon. A shopper chooses an occasion and style preferences, supplies a face selfie plus a full-body photo, then compares three generated virtual looks and downloads a Confidence Plan.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Set `YOUCAM_API_KEY` in `.env.local`. Never expose this value through `NEXT_PUBLIC_` variables or commit it.
3. The repository includes nine original, unbranded PNG garment references in
   `public/catalog/`; provenance is recorded in `docs/ASSET_ATTRIBUTION.md`.
4. Run `npm install` and `npm run dev`.
5. Open `http://localhost:3000`.

If Node reports `UNABLE_TO_VERIFY_LEAF_SIGNATURE` on a machine where antivirus
or an enterprise proxy inspects HTTPS, do not disable TLS verification. Export
the locally trusted public root certificate to an ignored PEM file, set
`NODE_EXTRA_CA_CERTS` in the shell that launches Node, and then start the app.
This is a local-machine trust setting and should not be copied to Railway.

## Repository safety

- Commit `.env.example` as the variable-name template; keep every populated
  `.env` variant local.
- Never commit API keys, credentials, certificates, shopper photos, raw YouCam
  responses, or generated session media.
- Local agent instructions, prompts, planning traces, editor state, deployment
  state, and private demo fixtures are excluded by `.gitignore`.
- Before publishing, this command should list only `.env.example`:

  ```powershell
  git ls-files ".env*" "private-demo-images/**" "generated-media/**"
  ```

## Live API status

On 2026-08-07, the application's local production build completed one Skin
Analysis task and three AI Clothes V3 tasks using original synthetic fixtures.
All four tasks succeeded; the full command took 38 seconds including uploads,
polling, and result downloads. Detailed evidence and privacy boundaries are
recorded in `docs/API_NOTES.md`.

## Tests and checks

```powershell
npm run lint
npm test
npx tsc --noEmit
npm run build
npm run test:e2e
```

## Architecture

- The browser keeps profile choices, task references, and result URLs only for the current session.
- Server routes keep `YOUCAM_API_KEY` private and proxy image-file initialization, task creation, and task-status polling to YouCam.
- The browser polls every two seconds. A failed VTO look can be retried without discarding successful looks.
- Skin results are optional cosmetic context only. The app does not make clinical, fit, sizing, or return-reduction claims.

## Railway deployment

1. Push this repository to GitHub. It can remain private during development.
2. Create a Railway service from the GitHub repository and grant Railway access
   to the private repository.
3. Set `YOUCAM_API_KEY` and `NEXT_PUBLIC_APP_URL` to the deployed public URL.
4. Confirm the complete upload, generation, retry, download, and clear-session flow with a clean browser session before recording the demo.

## Submission checklist

- Repository link with access and visibility that satisfy the current Devpost
  rules; re-check those rules immediately before submission.
- Five screenshots: selection, consent/upload, generation, comparison, final Confidence Plan.
- Public 150-180 second video showing the live API flow end-to-end.
- Devpost custom-answer notes collected in `docs/SUBMISSION_NOTES.md`.
