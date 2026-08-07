import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { catalog } from "./catalog";
import { selectLooks } from "./recommendation";

describe("selectLooks", () => {
  it("keeps every VTO catalog entry backed by a local PNG or JPEG reference", () => {
    const missingOrUnsupported = catalog
      .filter((outfit) => !/\.(png|jpe?g)$/i.test(outfit.assetPath)
        || !existsSync(path.join(process.cwd(), "public", outfit.assetPath.replace(/^\//, ""))))
      .map((outfit) => outfit.id);

    expect(missingOrUnsupported).toEqual([]);
  });

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
