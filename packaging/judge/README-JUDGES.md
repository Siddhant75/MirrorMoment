# MirrorMoment Judge Demo

MirrorMoment is a mobile-first shopper decision journey combining YouCam Skin
Analysis v2.1 with YouCam AI Clothes V3. It curates three occasion-aware looks,
adds optional non-medical cosmetic context, and produces a downloadable
Confidence Plan.

Public source repository:
https://github.com/Siddhant75/MirrorMoment

## Recommended key-free replay

The default is a **Recorded Judge Replay** captured from successful real YouCam
API outputs using one bundled fictional synthetic subject. The permanent badge
distinguishes this replay from live processing. Replay reproduces the app's
queued, processing, comparison, selection, and download experience without an
API key, account, paid host, or network call to YouCam.

Requirements: Windows and Node.js 20 or newer.

1. Extract the entire ZIP.
2. Double-click `RUN_JUDGE_DEMO.cmd`, or run:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\RUN_JUDGE_DEMO.ps1
   ```

3. Wait for `MirrorMoment is ready at http://127.0.0.1:3000`.
4. Open that URL manually in a browser.
5. Select both bundled demo images, give session consent, and create the plan.
6. Stop the attached launcher with Ctrl+C when finished.

The launcher does not open or control a browser. Source-contingency packages
run `npm.cmd ci` and build locally before starting; standalone packages start
immediately after the Node check.

## Optional live processing

Live mode requires a judge-provided YouCam key and never stores it in the
package. In the same PowerShell session:

```powershell
Set-Item Env:YOUCAM_API_KEY (Read-Host 'Enter your YouCam API key')
.\RUN_LIVE_DEMO.ps1
```

The badge changes to **Live YouCam**, arbitrary valid JPEG/PNG uploads become
available, and vendor failures do not fall back to replay results.

## Safety and privacy boundaries

- Skin output is optional cosmetic context, not medical advice or diagnosis.
- Apparel output is a visual preview, not sizing, fit certainty, or a guarantee.
- Catalog items and prices are fictional; no checkout or payment is included.
- The app stores only profile choices, task references, and completed URLs in
  browser session storage. Clear session removes browser-held app data only.
- The source images are synthetic. Raw vendor payloads, task IDs, upload URLs,
  signed result URLs, and creator credentials are not in this archive.

See `docs/API_NOTES.md`, `docs/ASSET_ATTRIBUTION.md`, `PACKAGE_KIND.txt`, and
`SHA256SUMS.txt` for integration evidence, provenance, package type, and file
integrity information.

## License and third-party boundaries

The included MirrorMoment application source code and project-authored
documentation are available under the MIT License in `LICENSE`. The license
does not grant rights to Perfect Corp.'s YouCam APIs, services, names,
trademarks, or recorded API outputs; those remain subject to the applicable
Perfect Corp. terms. Media provenance is documented in
`docs/ASSET_ATTRIBUTION.md`.
