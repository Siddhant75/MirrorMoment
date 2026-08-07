import { describe, expect, it } from "vitest";

import { summarizeSkinResult } from "./skin-summary";

describe("summarizeSkinResult", () => {
  it("uses the highest valid cosmetic score without making a medical claim", () => {
    const result = summarizeSkinResult({
      data: {
        results: {
          hydration: { score: 71 },
          texture: { score: 43 },
        },
      },
    });

    expect(result).toEqual({ label: "hydration", score: 71 });
  });

  it("returns null for a vendor payload without a usable cosmetic score", () => {
    expect(summarizeSkinResult({ data: { results: { hydration: { value: "unknown" } } } })).toBeNull();
  });

  it("normalizes the documented JSON output and maps moisture to cosmetic hydration copy", () => {
    const result = summarizeSkinResult({
      data: {
        task_status: "success",
        results: {
          output: [
            { type: "texture", ui_score: 76, raw_score: 80.1, mask_urls: [] },
            { type: "moisture", ui_score: 82, raw_score: 77.2, mask_urls: [] },
            { type: "radiance", ui_score: 79, raw_score: 76.5, mask_urls: [] },
          ],
        },
      },
    });

    expect(result).toEqual({ label: "hydration", score: 82 });
  });
});
