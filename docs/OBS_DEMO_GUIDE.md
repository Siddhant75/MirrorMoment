# MirrorMoment OBS Demo Guide

Use the recorded replay for a predictable key-free walkthrough. Use live mode
when you specifically want to record a new YouCam run and have already tested
the same two consented images.

## Before recording

1. Install Node.js 20 or newer and run `npm.cmd ci` once in the project folder.
2. For the recommended replay, run:

   ```powershell
   npm.cmd run demo:replay
   ```

3. For an optional live YouCam run, keep the key only in `.env.local`, then run:

   ```powershell
   npm.cmd run demo:live
   ```

4. Wait for `MirrorMoment is ready at http://127.0.0.1:3000`. Open that URL
   yourself in a clean browser window. The launcher never opens or controls a
   browser and never starts OBS.
5. Confirm the permanent badge says **Recorded Judge Replay** or **Live YouCam**
   before recording. Never show `.env.local`, the terminal history, or the key.

The live launcher prints only `YOUCAM_API_KEY status: configured`. It never
prints the credential. Replay mode clears the key from the app process.

## OBS setup

- Use a 1920 x 1080 canvas and record the browser window at 30 fps.
- Increase browser zoom if important labels are hard to read at video size.
- Disable notifications and hide bookmarks, personal tabs, and password tools.
- Capture microphone audio on a short test recording before the final take.
- Keep the launcher terminal attached in the background. Press Ctrl+C there only
  after the recording is finished.

## Recommended 2:55 walkthrough

| Time | What to show and say |
| --- | --- |
| 0:00-0:12 | State the purchase-confidence problem: outfit and cosmetic preparation are usually separate guesses. |
| 0:12-0:30 | Show the occasion, style, formality, and budget decision. In replay, explain why these inputs are truthfully locked to the recorded run. |
| 0:30-0:50 | Select the bundled synthetic selfie and full-body photo, explain optional Skin personalization, and give session consent. |
| 0:50-1:28 | Start generation and show real queued/processing states. An honest **38 seconds later** edit is acceptable; do not imply the API was instant. |
| 1:28-1:56 | Compare all three Apparel VTO results and explain that successful results survive partial failure. |
| 1:56-2:20 | Choose a look, show the optional Radiance cosmetic context, fictional cart, safety copy, and download the Confidence Plan. |
| 2:20-2:45 | Explain the upload-task-poll-result architecture, server-only key boundary, browser-only session storage, and retail value. |
| 2:45-2:55 | Close with the single decision journey: understand, compare, choose, and leave with a plan. |

Do one second take with Skin personalization switched off. Capture the fallback
copy **No Skin Analysis was used for this plan** for optional B-roll or a judge
question.

## Five screenshot moments

Capture clean 16:9 screenshots while the browser is in replay mode:

1. `01-selection.png` - locked occasion/style/formality/budget and replay badge.
2. `02-consent-images.png` - both synthetic images selected and consent visible.
3. `03-generation.png` - Skin and three VTO tasks visibly queued or processing.
4. `04-comparison.png` - all three completed virtual looks and choose controls.
5. `05-confidence-plan.png` - selected VTO, Radiance 85/100 context, rationale,
   fictional cart, safety disclaimer, and Download plan control.

## Recording integrity checklist

- Say **recorded replay** whenever replay mode is visible; do not call it a fresh
  API request.
- Show at least one real live-mode recording or clearly described live smoke
  evidence elsewhere in the submission to prove the YouCam integrations.
- Do not claim diagnosis, fit certainty, sizing accuracy, or reduced returns.
- Use only the bundled synthetic subject and fictional catalog in the recording.
- Stop the attached launcher with Ctrl+C after OBS has saved the video.
