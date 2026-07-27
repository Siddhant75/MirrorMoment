import { describe, expect, it } from "vitest";

import { selectLooks } from "./recommendation";

describe("selectLooks", () => {
  it("returns three distinct, occasion-compatible looks in deterministic preference order", () => {
    const looks = selectLooks({
      occasion: "interview",
      style: "classic",
      formality: "polished",
      budget: "mid",
      skinPersonalization: false,
    });

    expect(looks.map((look) => look.id)).toEqual([
      "navy-tailoring",
      "cocoa-blazer-set",
      "graphite-set",
    ]);
    expect(new Set(looks.map((look) => look.id)).size).toBe(3);
    expect(looks.every((look) => look.occasions.includes("interview"))).toBe(true);
  });
});
