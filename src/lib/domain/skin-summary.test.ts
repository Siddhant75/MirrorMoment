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
});
