# MirrorMoment

MirrorMoment is a mobile-first occasion-confidence demo for the YouCam API Skin AI & Apparel VTO Hackathon. A shopper chooses an occasion and style preferences, supplies a face selfie plus a full-body photo, then compares three generated virtual looks and downloads a Confidence Plan.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Set `YOUCAM_API_KEY` in `.env.local`. Never expose this value through `NEXT_PUBLIC_` variables or commit it.
3. The repository includes nine original, unbranded PNG garment references in
   `public/catalog/`; provenance is recorded in `docs/ASSET_ATTRIBUTION.md`.
4. Run `npm install` and `npm run dev`.
5. Open `http://localhost:3000`.

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

1. Push this repository to GitHub.
2. Create a Railway service from the GitHub repository.
3. Set `YOUCAM_API_KEY` and `NEXT_PUBLIC_APP_URL` to the deployed public URL.
4. Confirm the complete upload, generation, retry, download, and clear-session flow with a clean browser session before recording the demo.

## Submission checklist

- Public repository with setup instructions and license/asset notes.
- Five screenshots: selection, consent/upload, generation, comparison, final Confidence Plan.
- Public 150–180 second video showing the live API flow end-to-end.
- Devpost custom-answer notes collected in `docs/SUBMISSION_NOTES.md`.
