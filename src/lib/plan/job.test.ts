import { describe, expect, it } from "vitest";

import { YouCamError } from "@/lib/youcam/errors";

import { createPlanJob } from "./job";

describe("createPlanJob", () => {
  it("creates one opted-in skin task and exactly three clothes tasks", async () => {
    const clothesInputs: Array<[string, string]> = [];
    const job = await createPlanJob(
      {
        occasion: "date",
        style: "bold",
        formality: "formal",
        budget: "premium",
        skinPersonalization: true,
      },
      { faceFileId: "face-1", bodyFileId: "body-1" },
      {
        startSkinTask: async (fileId) => ({ taskId: `skin-${fileId}` }),
        startLookTask: async (bodyFileId, outfit) => {
          clothesInputs.push([bodyFileId, outfit.id]);
          return { taskId: `look-${clothesInputs.length}` };
        },
      },
    );

    expect(job.skinTask).toEqual({ taskId: "skin-face-1" });
    expect(job.lookTasks).toHaveLength(3);
    expect(clothesInputs).toHaveLength(3);
    expect(clothesInputs).toEqual([
      ["body-1", "black-evening-look"],
      ["body-1", "blue-satin-set"],
      ["body-1", "plum-wrap-dress"],
    ]);
  });

  it("skips the skin task when cosmetic personalization is disabled", async () => {
    const job = await createPlanJob(
      {
        occasion: "reset",
        style: "minimal",
        formality: "relaxed",
        budget: "value",
        skinPersonalization: false,
      },
      { bodyFileId: "body-1" },
      {
        startSkinTask: async () => ({ taskId: "should-not-run" }),
        startLookTask: async () => ({ taskId: "look" }),
      },
    );

    expect(job.skinTask).toBeUndefined();
    expect(job.lookTasks).toHaveLength(3);
  });

  it("preserves clothes task references when optional skin and one look fail to start", async () => {
    const job = await createPlanJob(
      {
        occasion: "interview",
        style: "classic",
        formality: "polished",
        budget: "mid",
        skinPersonalization: true,
      },
      { faceFileId: "face-1", bodyFileId: "body-1" },
      {
        startSkinTask: async () => {
          throw new YouCamError("vendor_unavailable", "Skin is temporarily unavailable.");
        },
        startLookTask: async (_bodyFileId, outfit) => {
          if (outfit.id === "cocoa-blazer-set") {
            throw new YouCamError("invalid_image", "Reference rejected.");
          }
          return { taskId: `task-${outfit.id}` };
        },
      },
    );

    expect(job.skinTask).toEqual({ status: "failed", errorCode: "vendor_unavailable" });
    expect(job.lookTasks).toEqual([
      { taskId: "task-navy-tailoring", outfitId: "navy-tailoring" },
      { status: "failed", errorCode: "invalid_image", outfitId: "cocoa-blazer-set" },
      { taskId: "task-graphite-set", outfitId: "graphite-set" },
    ]);
  });
});
