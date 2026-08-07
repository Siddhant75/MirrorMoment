import { describe, expect, it } from "vitest";

import { YouCamError } from "@/lib/youcam/errors";

import { createPlanJob } from "./job";

describe("createPlanJob", () => {
  it("creates one opted-in skin task and exactly three clothes tasks", async () => {
    const clothesInputs: Array<[string, string, "full_body"]> = [];
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
        createSkinTask: async (fileId) => ({ taskId: `skin-${fileId}` }),
        createClothesTask: async (...input) => {
          clothesInputs.push(input);
          return { taskId: `look-${clothesInputs.length}` };
        },
      },
      (outfitId) => `reference-${outfitId}`,
    );

    expect(job.skinTask).toEqual({ taskId: "skin-face-1" });
    expect(job.lookTasks).toHaveLength(3);
    expect(clothesInputs).toHaveLength(3);
    expect(clothesInputs.every(([bodyFileId, , category]) => bodyFileId === "body-1" && category === "full_body")).toBe(true);
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
        createSkinTask: async () => ({ taskId: "should-not-run" }),
        createClothesTask: async () => ({ taskId: "look" }),
      },
      () => "reference",
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
        createSkinTask: async () => {
          throw new YouCamError("vendor_unavailable", "Skin is temporarily unavailable.");
        },
        createClothesTask: async (_bodyFileId, referenceFileId) => {
          if (referenceFileId === "reference-cocoa-blazer-set") {
            throw new YouCamError("invalid_image", "Reference rejected.");
          }
          return { taskId: `task-${referenceFileId}` };
        },
      },
      async (outfitId) => `reference-${outfitId}`,
    );

    expect(job.skinTask).toEqual({ status: "failed", errorCode: "vendor_unavailable" });
    expect(job.lookTasks).toEqual([
      { taskId: "task-reference-navy-tailoring", outfitId: "navy-tailoring" },
      { status: "failed", errorCode: "invalid_image", outfitId: "cocoa-blazer-set" },
      { taskId: "task-reference-graphite-set", outfitId: "graphite-set" },
    ]);
  });
});
