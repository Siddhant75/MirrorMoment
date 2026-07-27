import { describe, expect, it } from "vitest";

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
});
