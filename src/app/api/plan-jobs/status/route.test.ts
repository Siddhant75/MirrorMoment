import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMirrorMomentProvider } from "@/lib/server/provider";

import { POST } from "./route";

vi.mock("@/lib/server/provider", () => ({ getMirrorMomentProvider: vi.fn() }));

describe("POST /api/plan-jobs/status", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns a normalized cosmetic summary without exposing the vendor payload", async () => {
    vi.mocked(getMirrorMomentProvider).mockReturnValue({
      readSkinTask: vi.fn().mockResolvedValue({
        status: "succeeded",
        summary: { label: "hydration", score: 88 },
      }),
      readLookTask: vi.fn()
        .mockResolvedValueOnce({ status: "succeeded", resultUrl: "https://vendor.example/look-1.png" })
        .mockResolvedValueOnce({ status: "processing" })
        .mockResolvedValueOnce({ status: "failed", errorCode: "invalid_image" }),
    } as unknown as ReturnType<typeof getMirrorMomentProvider>);

    const response = await POST(new Request("http://localhost/api/plan-jobs/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skinTask: { taskId: "skin-1" },
        lookTasks: [
          { taskId: "look-1", outfitId: "navy-tailoring" },
          { taskId: "look-2", outfitId: "cocoa-blazer-set" },
          { taskId: "look-3", outfitId: "graphite-set" },
        ],
      }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      skin: { status: "succeeded", summary: { label: "hydration", score: 88 } },
      looks: [
        { outfitId: "navy-tailoring", status: "succeeded", resultUrl: "https://vendor.example/look-1.png" },
        { outfitId: "cocoa-blazer-set", status: "processing" },
        { outfitId: "graphite-set", status: "failed", errorCode: "invalid_image" },
      ],
    });
  });

  it("preserves successful look statuses when another vendor poll rejects", async () => {
    vi.mocked(getMirrorMomentProvider).mockReturnValue({
      readSkinTask: vi.fn().mockRejectedValue(new Error("temporary skin poll failure")),
      readLookTask: vi.fn()
        .mockResolvedValueOnce({ status: "succeeded", resultUrl: "https://vendor.example/look-1.png" })
        .mockRejectedValueOnce(new Error("temporary look poll failure"))
        .mockResolvedValueOnce({ status: "failed", errorCode: "invalid_image" }),
    } as unknown as ReturnType<typeof getMirrorMomentProvider>);

    const response = await POST(new Request("http://localhost/api/plan-jobs/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skinTask: { taskId: "skin-1" },
        lookTasks: [
          { taskId: "look-1", outfitId: "navy-tailoring" },
          { taskId: "look-2", outfitId: "cocoa-blazer-set" },
          { taskId: "look-3", outfitId: "graphite-set" },
        ],
      }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      skin: { status: "processing", errorCode: "unexpected_error" },
      looks: [
        { outfitId: "navy-tailoring", status: "succeeded", resultUrl: "https://vendor.example/look-1.png" },
        { outfitId: "cocoa-blazer-set", status: "processing", errorCode: "unexpected_error" },
        { outfitId: "graphite-set", status: "failed", errorCode: "invalid_image" },
      ],
    });
  });

  it("returns task-creation failures without polling them", async () => {
    const readSkinTask = vi.fn();
    const readLookTask = vi.fn()
      .mockResolvedValueOnce({ status: "processing" })
      .mockResolvedValueOnce({ status: "succeeded", resultUrl: "https://vendor.example/look-3.png" });
    vi.mocked(getMirrorMomentProvider).mockReturnValue({ readSkinTask, readLookTask } as unknown as ReturnType<typeof getMirrorMomentProvider>);

    const response = await POST(new Request("http://localhost/api/plan-jobs/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skinTask: { status: "failed", errorCode: "vendor_unavailable" },
        lookTasks: [
          { taskId: "look-1", outfitId: "navy-tailoring" },
          { status: "failed", errorCode: "invalid_image", outfitId: "cocoa-blazer-set" },
          { taskId: "look-3", outfitId: "graphite-set" },
        ],
      }),
    }));

    expect(response.status).toBe(200);
    expect(readSkinTask).not.toHaveBeenCalled();
    expect(readLookTask).toHaveBeenCalledTimes(2);
    expect(await response.json()).toEqual({
      skin: { status: "failed", errorCode: "vendor_unavailable" },
      looks: [
        { outfitId: "navy-tailoring", status: "processing" },
        { outfitId: "cocoa-blazer-set", status: "failed", errorCode: "invalid_image" },
        { outfitId: "graphite-set", status: "succeeded", resultUrl: "https://vendor.example/look-3.png" },
      ],
    });
  });
});
