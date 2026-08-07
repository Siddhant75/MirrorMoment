"use client";

import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { buildConfidencePlan } from "@/lib/domain/recommendation";
import { budgets, formalities, occasions, styles, type ShopperProfile } from "@/lib/domain/types";
import { isTaskReference, type TaskAttempt } from "@/lib/plan/types";
import {
  MIRROR_MOMENT_SESSION_KEY,
  parseMirrorMomentSession,
  removeMirrorMomentSession,
  writeMirrorMomentSession,
  type JobStatus,
  type PlanJob,
  type StoredSession,
  type TaskReference,
  type TaskState,
} from "@/lib/session/mirror-moment-session";

const initialProfile: ShopperProfile = {
  occasion: "interview",
  style: "classic",
  formality: "polished",
  budget: "mid",
  skinPersonalization: true,
};

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 90_000;
const EMPTY_SESSION_SNAPSHOT = "__mirrormoment_empty_session__";

function subscribeToSessionSnapshot() {
  return () => undefined;
}

function getSessionSnapshot() {
  return sessionStorage.getItem(MIRROR_MOMENT_SESSION_KEY) ?? EMPTY_SESSION_SNAPSHOT;
}

function getServerSessionSnapshot() {
  return null;
}

function isTerminal(status: TaskState) {
  return status === "succeeded" || status === "failed";
}

function isJobTerminal(status: JobStatus) {
  return status.looks.every((look) => isTerminal(look.status))
    && (!status.skin || isTerminal(status.skin.status));
}

function mergeTaskState<T extends { status: TaskState }>(current: T | undefined, next: T | undefined): T | undefined {
  if (!current) return next;
  if (!next || isTerminal(current.status)) return current;
  return next;
}

export function mergeJobStatus(current: JobStatus | null, next: JobStatus): JobStatus {
  if (!current) return next;
  const nextLooks = new Map(next.looks.map((look) => [look.outfitId, look]));
  return {
    skin: mergeTaskState(current.skin, next.skin),
    looks: current.looks.map((look) => mergeTaskState(look, nextLooks.get(look.outfitId)) ?? look),
  };
}

function initialTaskState(task: TaskAttempt) {
  return isTaskReference(task)
    ? { status: "queued" as const }
    : { status: "failed" as const, errorCode: task.errorCode };
}

function waitForPollDelay(signal: AbortSignal) {
  return new Promise<boolean>((resolve) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      window.clearTimeout(timer);
      resolve(false);
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve(true);
    }, POLL_INTERVAL_MS);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}

function matchesInitialProfile(profile: ShopperProfile) {
  return Object.entries(initialProfile).every(([key, value]) => profile[key as keyof ShopperProfile] === value);
}

function readable(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("-", " ");
}

async function upload(file: File, purpose: "skin" | "clothes") {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("purpose", purpose);
  const response = await fetch("/api/uploads", { method: "POST", body: formData });
  if (!response.ok) throw new Error("We could not prepare that photo. Please try another image.");
  return response.json() as Promise<{ fileId: string }>;
}

export function MirrorMomentApp() {
  const sessionSnapshot = useSyncExternalStore(
    subscribeToSessionSnapshot,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );

  if (sessionSnapshot === null) {
    return (
      <main className="min-h-screen bg-[#f7f4ef] px-4 py-8 text-[#221d1a]" aria-busy="true">
        <p className="mx-auto max-w-6xl text-sm text-[#635a53]">Preparing MirrorMoment…</p>
      </main>
    );
  }

  const initialSession = parseMirrorMomentSession(
    sessionSnapshot === EMPTY_SESSION_SNAPSHOT ? null : sessionSnapshot,
  );
  return <HydratedMirrorMomentApp initialSession={initialSession} />;
}

function restoredStatus(session: StoredSession | null): JobStatus | null {
  if (!session?.job) return null;

  const completedByOutfit = new Map(session.completedLooks.map((look) => [look.outfitId, look.resultUrl]));
  return {
    skin: session.job.skinTask ? initialTaskState(session.job.skinTask) : undefined,
    looks: session.job.lookTasks.map((look) => {
      const resultUrl = completedByOutfit.get(look.outfitId);
      return resultUrl
        ? { outfitId: look.outfitId, status: "succeeded", resultUrl }
        : { outfitId: look.outfitId, ...initialTaskState(look) };
    }),
  };
}

function HydratedMirrorMomentApp({ initialSession }: { initialSession: StoredSession | null }) {
  const [profile, setProfile] = useState<ShopperProfile>(initialSession?.profile ?? initialProfile);
  const [consent, setConsent] = useState(false);
  const [facePhoto, setFacePhoto] = useState<File | null>(null);
  const [bodyPhoto, setBodyPhoto] = useState<File | null>(null);
  const [job, setJob] = useState<PlanJob | null>(initialSession?.job ?? null);
  const [status, setStatus] = useState<JobStatus | null>(() => restoredStatus(initialSession));
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const planRef = useRef<HTMLDivElement>(null);

  const skinSummary = status?.skin?.status === "succeeded" ? status.skin.summary ?? null : null;
  const confidencePlan = useMemo(() => buildConfidencePlan(profile, skinSummary), [profile, skinSummary]);
  const selectedLook = confidencePlan.looks.find((look) => look.id === selectedOutfitId);
  const selectedResult = status?.looks.find((look) => look.outfitId === selectedOutfitId && look.status === "succeeded");
  const fictionalPrice = selectedLook
    ? { value: "$68", mid: "$128", premium: "$228" }[selectedLook.budget]
    : null;
  const canStart = consent && bodyPhoto !== null && (!profile.skinPersonalization || facePhoto !== null);
  const allSettled = status !== null && isJobTerminal(status);

  useEffect(() => {
    if (!job && matchesInitialProfile(profile)) {
      sessionStorage.removeItem(MIRROR_MOMENT_SESSION_KEY);
      return;
    }
    writeMirrorMomentSession(sessionStorage, profile, job, status);
  }, [job, profile, status]);

  useEffect(() => {
    if (!job || allSettled) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      controller.abort();
      setStatus((current) => current ? {
        skin: current.skin && !isTerminal(current.skin.status)
          ? { status: "failed", errorCode: "timeout" }
          : current.skin,
        looks: current.looks.map((look) => isTerminal(look.status)
          ? look
          : { outfitId: look.outfitId, status: "failed", errorCode: "timeout" }),
      } : current);
      setError("Generation took longer than 90 seconds. Your completed looks are safe; retry any unfinished look.");
    }, POLL_TIMEOUT_MS);

    async function pollUntilSettled() {
      while (!cancelled) {
        if (!await waitForPollDelay(controller.signal) || cancelled) return;
        try {
          const response = await fetch("/api/plan-jobs/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(job),
            signal: controller.signal,
          });
          if (!response.ok || cancelled) continue;
          const next = await response.json() as JobStatus;
          if (cancelled) return;
          setStatus((current) => mergeJobStatus(current, next));
          if (isJobTerminal(next)) return;
        } catch {
          if (controller.signal.aborted || cancelled) return;
        }
      }
    }

    void pollUntilSettled();
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [allSettled, job]);

  async function createPlan() {
    if (!canStart || !bodyPhoto) return;
    setIsStarting(true);
    setError(null);
    setStatus(null);
    setSelectedOutfitId(null);
    try {
      const uploadResults = await Promise.allSettled([
        upload(bodyPhoto, "clothes"),
        ...(profile.skinPersonalization && facePhoto ? [upload(facePhoto, "skin")] : []),
      ]);
      const bodyResult = uploadResults[0];
      if (bodyResult.status === "rejected") throw bodyResult.reason;
      const faceResult = uploadResults[1];
      const skinUploadFailed = profile.skinPersonalization && faceResult?.status === "rejected";
      const requestProfile = skinUploadFailed
        ? { ...profile, skinPersonalization: false }
        : profile;
      const response = await fetch("/api/plan-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: requestProfile,
          bodyFileId: bodyResult.value.fileId,
          faceFileId: faceResult?.status === "fulfilled" ? faceResult.value.fileId : undefined,
        }),
      });
      if (!response.ok) throw new Error("We could not create your plan. Please try again.");
      const vendorJob = await response.json() as PlanJob;
      const createdJob: PlanJob = skinUploadFailed
        ? { ...vendorJob, skinTask: { status: "failed", errorCode: "vendor_unavailable" } }
        : vendorJob;
      setJob(createdJob);
      setStatus({
        skin: createdJob.skinTask ? initialTaskState(createdJob.skinTask) : undefined,
        looks: createdJob.lookTasks.map((look) => ({ outfitId: look.outfitId, ...initialTaskState(look) })),
      });
      if (skinUploadFailed) {
        setError("Cosmetic personalization could not start, so your three virtual looks are continuing without it.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setIsStarting(false);
    }
  }

  async function retryLook(outfitId: string) {
    if (!bodyPhoto) {
      setError("Re-upload your full-body photo to retry this look.");
      return;
    }
    try {
      const body = await upload(bodyPhoto, "clothes");
      const response = await fetch("/api/look-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyFileId: body.fileId, outfitId }),
      });
      if (!response.ok) throw new Error("That look could not be retried.");
      const replacement = await response.json() as TaskReference & { outfitId: string };
      setJob((current) => current ? { ...current, lookTasks: current.lookTasks.map((look) => look.outfitId === outfitId ? replacement : look) } : current);
      setStatus((current) => current ? { ...current, looks: current.looks.map((look) => look.outfitId === outfitId ? { outfitId, status: "queued" } : look) } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That look could not be retried.");
    }
  }

  async function downloadPlan() {
    if (!planRef.current) return;
    const dataUrl = await toPng(planRef.current, { pixelRatio: 2, backgroundColor: "#f7f4ef" });
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = "mirrormoment-confidence-plan.png";
    anchor.click();
  }

  function clearSession() {
    removeMirrorMomentSession(sessionStorage);
    setProfile(initialProfile);
    setConsent(false);
    setJob(null);
    setStatus(null);
    setSelectedOutfitId(null);
    setFacePhoto(null);
    setBodyPhoto(null);
    setError(null);
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-4 py-8 text-[#221d1a] sm:px-8 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col justify-between gap-4 border-b border-[#d8d0c7] pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#a84e3f]">MirrorMoment</p>
            <h1 className="font-serif text-4xl leading-tight sm:text-5xl">A look that meets the moment.</h1>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[#635a53]">One guided decision for your outfit and optional cosmetic prep—built for the moments that matter.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8" aria-labelledby="personalize-heading">
            <h2 id="personalize-heading" className="font-serif text-2xl">1. Set your moment</h2>
            <p className="mt-2 text-sm text-[#635a53]">Choose what you are getting ready for. We’ll use these choices to curate three complete looks.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {([
                ["occasion", occasions],
                ["style", styles],
                ["formality", formalities],
                ["budget", budgets],
              ] as const).map(([field, values]) => (
                <label key={field} className="grid gap-2 text-sm font-medium">
                  {readable(field)}
                  <select
                    className="rounded-xl border border-[#d8d0c7] bg-[#fffdfa] px-3 py-3"
                    value={profile[field]}
                    onChange={(event) => setProfile((current) => ({ ...current, [field]: event.target.value }))}
                  >
                    {values.map((value) => <option key={value} value={value}>{readable(value)}</option>)}
                  </select>
                </label>
              ))}
            </div>

            <div className="mt-8 border-t border-[#ece6df] pt-6">
              <h2 className="font-serif text-2xl">2. Add your photos</h2>
              <p className="mt-2 text-sm text-[#635a53]">Use a clear front-facing selfie for optional cosmetic personalization and a full-body photo for virtual try-on.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 rounded-2xl border border-dashed border-[#cbbdaf] p-4 text-sm font-medium">
                  Face selfie {profile.skinPersonalization ? "(required)" : "(optional)"}
                  <input aria-label="Face selfie" type="file" accept="image/jpeg,image/png" onChange={(event) => setFacePhoto(event.target.files?.[0] ?? null)} />
                  <span className="text-xs font-normal text-[#635a53]">Clear, front-facing, well lit.</span>
                </label>
                <label className="grid gap-2 rounded-2xl border border-dashed border-[#cbbdaf] p-4 text-sm font-medium">
                  Full-body photo (required)
                  <input aria-label="Full-body photo" type="file" accept="image/jpeg,image/png" onChange={(event) => setBodyPhoto(event.target.files?.[0] ?? null)} />
                  <span className="text-xs font-normal text-[#635a53]">Stand upright with your full look in frame.</span>
                </label>
              </div>
              <label className="mt-5 flex gap-3 text-sm leading-5">
                <input
                  type="checkbox"
                  checked={profile.skinPersonalization}
                  onChange={(event) => setProfile((current) => ({ ...current, skinPersonalization: event.target.checked }))}
                />
                Include optional cosmetic personalization in my plan.
              </label>
              <label className="mt-4 flex gap-3 text-sm leading-5">
                <input aria-label="I consent to processing these photos for this session." type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                I consent to processing these photos for this session.
              </label>
              {!bodyPhoto && <p className="mt-3 text-sm text-[#a84e3f]">A full-body photo is required to create virtual looks.</p>}
              {profile.skinPersonalization && !facePhoto && <p className="mt-3 text-sm text-[#a84e3f]">Add a face selfie or turn off cosmetic personalization.</p>}
            </div>

            <button className="mt-7 rounded-full bg-[#221d1a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#4d332e] disabled:cursor-not-allowed disabled:bg-[#b8afa7]" disabled={!canStart || isStarting} onClick={createPlan}>
              {isStarting ? "Preparing your plan…" : "Create my confidence plan"}
            </button>
            {error && <p className="mt-4 rounded-xl bg-[#fff0ec] p-3 text-sm text-[#8f3528]" role="alert">{error}</p>}
          </section>

          <aside className="rounded-3xl bg-[#201b19] p-6 text-[#fffaf3] shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f1aa93]">Your plan</p>
            <h2 className="mt-3 font-serif text-3xl">{readable(profile.occasion)}, made personal.</h2>
            <p className="mt-4 text-sm leading-6 text-[#d7cec6]">Your three looks will be selected around the style and formality you chose. Cosmetic personalization is always optional.</p>
            <div className="mt-6 grid gap-3">
              {confidencePlan.looks.map((look, index) => (
                <div key={look.id} className="rounded-2xl bg-white/10 p-4">
                  <span className="text-xs text-[#f1aa93]">LOOK 0{index + 1}</span>
                  <p className="mt-1 font-semibold">{look.title}</p>
                  <p className="mt-1 text-sm text-[#d7cec6]">{look.description}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {status && (
          <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8" aria-live="polite">
            <h2 className="font-serif text-2xl">3. Compare your virtual looks</h2>
            <p className="mt-2 text-sm text-[#635a53]">We keep any successful look available even if another needs a retry.</p>
            {status.skin && (
              <p className="mt-3 rounded-xl bg-[#f7f4ef] px-4 py-3 text-sm text-[#635a53]">
                {status.skin.status === "succeeded" && status.skin.summary
                  ? "Cosmetic personalization ready."
                  : status.skin.status === "failed" || status.skin.status === "succeeded"
                    ? "Cosmetic personalization is unavailable; your plan remains occasion-and-style personalized."
                    : "Cosmetic personalization is in progress."}
              </p>
            )}
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {status.looks.map((look) => {
                const outfit = confidencePlan.looks.find((item) => item.id === look.outfitId);
                return (
                  <article key={look.outfitId} className="overflow-hidden rounded-2xl border border-[#e8e0d8]">
                    <div className="flex min-h-64 items-center justify-center bg-[#eee7df] p-4">
                      {look.status === "succeeded" && look.resultUrl ? (
                        // Vendor result URLs are short-lived and may use multiple signed domains.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={look.resultUrl} alt={`Virtual try-on of ${outfit?.title ?? "selected look"}`} className="max-h-72 rounded-xl object-contain" />
                      ) : <p className="text-center text-sm text-[#635a53]">{look.status === "failed" ? "This look needs a retry." : "Generating virtual try-on…"}</p>}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold">{outfit?.title}</h3>
                      {look.status === "succeeded" ? <button onClick={() => setSelectedOutfitId(look.outfitId)} className="mt-3 text-sm font-semibold text-[#a84e3f]">Choose this look</button> : look.status === "failed" ? <button onClick={() => retryLook(look.outfitId)} className="mt-3 text-sm font-semibold text-[#a84e3f]">Retry this look</button> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {selectedOutfitId && selectedLook && selectedResult?.resultUrl && (
          <section ref={planRef} className="mt-8 rounded-3xl bg-[#e9dfd3] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a84e3f]">Confidence Plan</p>
            <div className="mt-5 grid gap-6 md:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)]">
              {/* Vendor result URLs are short-lived and may use multiple signed domains. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedResult.resultUrl}
                alt={`Selected virtual try-on: ${selectedLook.title}`}
                className="max-h-[30rem] w-full rounded-2xl bg-white/60 object-contain"
              />
              <div>
                <h2 className="font-serif text-3xl">{selectedLook.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#4e433b]">{selectedLook.description}</p>
                <p className="mt-4 text-sm leading-6 text-[#4e433b]">{confidencePlan.explanation}</p>
                <dl className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-white/60 p-4 text-sm">
                  <div><dt className="text-[#806d60]">Occasion</dt><dd className="font-semibold">{readable(profile.occasion)}</dd></div>
                  <div><dt className="text-[#806d60]">Style</dt><dd className="font-semibold">{readable(profile.style)}</dd></div>
                  <div><dt className="text-[#806d60]">Formality</dt><dd className="font-semibold">{readable(selectedLook.formality)}</dd></div>
                  <div><dt className="text-[#806d60]">Budget tier</dt><dd className="font-semibold">{readable(selectedLook.budget)}</dd></div>
                </dl>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-white/70 p-5">
                <p className="font-semibold">{confidencePlan.beautyEdit.title}</p>
                <p className="mt-1 text-sm text-[#635a53]">{confidencePlan.beautyEdit.description}</p>
                <p className="mt-3 text-sm text-[#635a53]">
                  {skinSummary
                    ? `Cosmetic signal: ${readable(skinSummary.label)} ${skinSummary.score}/100`
                    : "No Skin Analysis was used for this plan."}
                </p>
                <p className="mt-3 text-xs uppercase tracking-wide text-[#8f7465]">{confidencePlan.personalizationLabel}</p>
              </div>
              <div className="rounded-2xl bg-[#221d1a] p-5 text-white">
                <p className="text-xs uppercase tracking-[0.16em] text-[#f1aa93]">Fictional cart estimate</p>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <div><p className="font-semibold">{selectedLook.title}</p><p className="mt-1 text-xs text-[#d7cec6]">MirrorMoment demo catalog</p></div>
                  <p className="font-serif text-2xl">{fictionalPrice}</p>
                </div>
                <p className="mt-4 text-xs leading-5 text-[#d7cec6]">Demo price only. No sizing or fit assessment is provided.</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={downloadPlan} className="rounded-full bg-[#221d1a] px-5 py-3 text-sm font-semibold text-white">Download plan</button>
              <button onClick={clearSession} className="rounded-full border border-[#806d60] px-5 py-3 text-sm font-semibold text-[#4e433b]">Clear session</button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
