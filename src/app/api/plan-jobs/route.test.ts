import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMirrorMomentProvider } from "@/lib/server/provider";
import { YouCamError } from "@/lib/youcam/errors";

import { POST } from "./route";

vi.mock("@/lib/server/provider", () => ({ getMirrorMomentProvider: vi.fn() }));

const profile = {
  occasion: "interview",
  style: "classic",
  formality: "polished",
  budget: "mid",
  skinPersonalization: true,
} as const;

function planRequest(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/plan-jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, faceFileId: "face-1", bodyFileId: "body-1", ...overrides }),
  });
}

describe("POST /api/plan-jobs", () => {
  beforeEach(() => vi.resetAllMocks());

  it("creates one optional Skin task and exactly three selected look tasks", async () => {
    const startSkinTask = vi.fn().mockResolvedValue({ taskId: "skin-1" });
    const startLookTask = vi.fn(async (_bodyFileId: string, outfit: { id: string }) => ({ taskId: `look-${outfit.id}` }));
    vi.mocked(getMirrorMomentProvider).mockReturnValue({ startSkinTask, startLookTask } as never);

    const response = await POST(planRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(startSkinTask).toHaveBeenCalledOnce();
    expect(startSkinTask).toHaveBeenCalledWith("face-1");
    expect(startLookTask).toHaveBeenCalledTimes(3);
    expect(startLookTask.mock.calls.map(([, outfit]) => outfit.id)).toEqual([
      "navy-tailoring",
      "cocoa-blazer-set",
      "graphite-set",
    ]);
    expect(body.lookTasks).toHaveLength(3);
  });

  it("rejects opted-in Skin personalization without a face reference", async () => {
    const response = await POST(planRequest({ faceFileId: undefined }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "A face selfie is required when cosmetic personalization is enabled.",
    });
    expect(getMirrorMomentProvider).not.toHaveBeenCalled();
  });

  it("preserves successful tasks when Skin and one look fail to start", async () => {
    const startSkinTask = vi.fn().mockRejectedValue(
      new YouCamError("vendor_unavailable", "Skin unavailable."),
    );
    const startLookTask = vi.fn(async (_bodyFileId: string, outfit: { id: string }) => {
      if (outfit.id === "cocoa-blazer-set") {
        throw new YouCamError("invalid_image", "Reference rejected.");
      }
      return { taskId: `look-${outfit.id}` };
    });
    vi.mocked(getMirrorMomentProvider).mockReturnValue({ startSkinTask, startLookTask } as never);

    const response = await POST(planRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      skinTask: { status: "failed", errorCode: "vendor_unavailable" },
      lookTasks: [
        { taskId: "look-navy-tailoring", outfitId: "navy-tailoring" },
        { status: "failed", errorCode: "invalid_image", outfitId: "cocoa-blazer-set" },
        { taskId: "look-graphite-set", outfitId: "graphite-set" },
      ],
    });
  });
});
