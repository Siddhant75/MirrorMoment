import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mergeJobStatus, MirrorMomentApp } from "./mirror-moment-app";

describe("MirrorMomentApp", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("requires consent and a full-body photo before a plan can start", () => {
    render(<MirrorMomentApp />);

    const start = screen.getByRole("button", { name: "Create my confidence plan" });
    expect(start).toBeDisabled();

    fireEvent.click(screen.getByLabelText("I consent to processing these photos for this session."));
    expect(start).toBeDisabled();
    expect(screen.getByText("A full-body photo is required to create virtual looks.")).toBeInTheDocument();
  });

  it("continues with three VTO tasks when the optional face upload fails", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ fileId: "body-file" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Skin upload unavailable." }), { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        lookTasks: [
          { taskId: "look-1", outfitId: "navy-tailoring" },
          { taskId: "look-2", outfitId: "cocoa-blazer-set" },
          { taskId: "look-3", outfitId: "graphite-set" },
        ],
      }), { status: 200 }));

    render(<MirrorMomentApp />);
    fireEvent.change(screen.getByLabelText("Face selfie"), {
      target: { files: [new File(["face"], "face.png", { type: "image/png" })] },
    });
    fireEvent.change(screen.getByLabelText("Full-body photo"), {
      target: { files: [new File(["body"], "body.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByLabelText("I consent to processing these photos for this session."));
    fireEvent.click(screen.getByRole("button", { name: "Create my confidence plan" }));

    expect(await screen.findByRole("heading", { name: "3. Compare your virtual looks" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Cosmetic personalization could not start");
    expect(screen.getByText("Cosmetic personalization is unavailable; your plan remains occasion-and-style personalized.")).toBeInTheDocument();

    const planRequest = fetchMock.mock.calls.find(([input]) => input === "/api/plan-jobs");
    expect(planRequest).toBeDefined();
    expect(JSON.parse(String((planRequest?.[1] as RequestInit).body))).toMatchObject({
      profile: { skinPersonalization: false },
      bodyFileId: "body-file",
    });
  });

  it("restores profile choices, task references, and completed result URLs from the session", async () => {
    sessionStorage.setItem("mirrormoment-session", JSON.stringify({
      version: 1,
      profile: {
        occasion: "wedding",
        style: "minimal",
        formality: "polished",
        budget: "mid",
        skinPersonalization: false,
      },
      job: {
        lookTasks: [
          { taskId: "look-1", outfitId: "ivory-jumpsuit" },
          { taskId: "look-2", outfitId: "sage-midi" },
          { taskId: "look-3", outfitId: "linen-layered-look" },
        ],
      },
      completedLooks: [
        { outfitId: "ivory-jumpsuit", resultUrl: "https://vendor.example/ivory.png" },
      ],
    }));

    render(<MirrorMomentApp />);

    expect(await screen.findByRole("heading", { name: "3. Compare your virtual looks" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Occasion" })).toHaveValue("wedding");
    expect(screen.getByAltText("Virtual try-on of Ivory Jumpsuit")).toHaveAttribute("src", "https://vendor.example/ivory.png");
  });

  it("makes unfinished looks retryable after the 90-second polling limit", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-07T12:00:00Z"));
    sessionStorage.setItem("mirrormoment-session", JSON.stringify({
      version: 1,
      profile: {
        occasion: "interview",
        style: "classic",
        formality: "polished",
        budget: "mid",
        skinPersonalization: false,
      },
      job: {
        lookTasks: [
          { taskId: "look-1", outfitId: "navy-tailoring" },
          { taskId: "look-2", outfitId: "cocoa-blazer-set" },
          { taskId: "look-3", outfitId: "graphite-set" },
        ],
      },
      completedLooks: [],
    }));
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({
      looks: [
        { outfitId: "navy-tailoring", status: "processing" },
        { outfitId: "cocoa-blazer-set", status: "queued" },
        { outfitId: "graphite-set", status: "processing" },
      ],
    }), { status: 200 }));

    render(<MirrorMomentApp />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(90_001);
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Generation took longer than 90 seconds");
    expect(screen.getAllByRole("button", { name: "Retry this look" })).toHaveLength(3);
  });

  it("shows successful optional skin progress and uses its cosmetic summary in the final plan", async () => {
    vi.useFakeTimers();
    sessionStorage.setItem("mirrormoment-session", JSON.stringify({
      version: 1,
      profile: {
        occasion: "interview",
        style: "classic",
        formality: "polished",
        budget: "mid",
        skinPersonalization: true,
      },
      job: {
        skinTask: { taskId: "skin-1" },
        lookTasks: [
          { taskId: "look-1", outfitId: "navy-tailoring" },
          { taskId: "look-2", outfitId: "cocoa-blazer-set" },
          { taskId: "look-3", outfitId: "graphite-set" },
        ],
      },
      completedLooks: [
        { outfitId: "navy-tailoring", resultUrl: "https://vendor.example/navy.png" },
        { outfitId: "cocoa-blazer-set", resultUrl: "https://vendor.example/cocoa.png" },
        { outfitId: "graphite-set", resultUrl: "https://vendor.example/graphite.png" },
      ],
    }));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      skin: { status: "succeeded", summary: { label: "hydration", score: 88 } },
      looks: [
        { outfitId: "navy-tailoring", status: "succeeded", resultUrl: "https://vendor.example/navy.png" },
        { outfitId: "cocoa-blazer-set", status: "succeeded", resultUrl: "https://vendor.example/cocoa.png" },
        { outfitId: "graphite-set", status: "succeeded", resultUrl: "https://vendor.example/graphite.png" },
      ],
    }), { status: 200 }));

    render(<MirrorMomentApp />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_001);
    });

    expect(screen.getByText("Cosmetic personalization ready.")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Choose this look" })[0]);
    expect(screen.getByText("skin-and-style personalized")).toBeInTheDocument();
    expect(screen.getByText("Comfort-first prep")).toBeInTheDocument();
    expect(screen.getByAltText("Selected virtual try-on: Navy Tailoring")).toHaveAttribute("src", "https://vendor.example/navy.png");
    expect(screen.getByText("Fictional cart estimate")).toBeInTheDocument();
    expect(screen.getByText("Cosmetic signal: Hydration 88/100")).toBeInTheDocument();
  });

  it("makes the no-skin fallback explicit in a completed plan", async () => {
    sessionStorage.setItem("mirrormoment-session", JSON.stringify({
      version: 1,
      profile: {
        occasion: "interview",
        style: "classic",
        formality: "polished",
        budget: "mid",
        skinPersonalization: false,
      },
      job: {
        lookTasks: [
          { taskId: "look-1", outfitId: "navy-tailoring" },
          { taskId: "look-2", outfitId: "cocoa-blazer-set" },
          { taskId: "look-3", outfitId: "graphite-set" },
        ],
      },
      completedLooks: [
        { outfitId: "navy-tailoring", resultUrl: "https://vendor.example/navy.png" },
        { outfitId: "cocoa-blazer-set", resultUrl: "https://vendor.example/cocoa.png" },
        { outfitId: "graphite-set", resultUrl: "https://vendor.example/graphite.png" },
      ],
    }));

    render(<MirrorMomentApp />);
    fireEvent.click(await screen.findAllByRole("button", { name: "Choose this look" }).then((buttons) => buttons[0]));

    expect(screen.getByText("occasion-and-style personalized")).toBeInTheDocument();
    expect(screen.getByText("No Skin Analysis was used for this plan.")).toBeInTheDocument();
  });

  it("never regresses completed results when a stale poll reports an earlier state", () => {
    expect(mergeJobStatus(
      {
        looks: [
          { outfitId: "navy-tailoring", status: "succeeded", resultUrl: "https://vendor.example/navy.png" },
          { outfitId: "cocoa-blazer-set", status: "processing" },
          { outfitId: "graphite-set", status: "failed", errorCode: "invalid_image" },
        ],
      },
      {
        looks: [
          { outfitId: "navy-tailoring", status: "processing" },
          { outfitId: "cocoa-blazer-set", status: "succeeded", resultUrl: "https://vendor.example/cocoa.png" },
          { outfitId: "graphite-set", status: "queued" },
        ],
      },
    )).toEqual({
      looks: [
        { outfitId: "navy-tailoring", status: "succeeded", resultUrl: "https://vendor.example/navy.png" },
        { outfitId: "cocoa-blazer-set", status: "succeeded", resultUrl: "https://vendor.example/cocoa.png" },
        { outfitId: "graphite-set", status: "failed", errorCode: "invalid_image" },
      ],
    });
  });
});
