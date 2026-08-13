// @vitest-environment node

import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { catalog } from "@/lib/domain/catalog";

import { replayAssets, replayScenario } from "./scenario";

describe("recorded replay scenario", () => {
  it("ships five local assets whose bytes match the generated manifest", async () => {
    expect(Object.keys(replayAssets)).toHaveLength(5);

    for (const asset of Object.values(replayAssets)) {
      expect(asset.path).toMatch(/^\/replay\/[a-z0-9-]+\.jpg$/);
      expect(asset.contentType).toBe("image/jpeg");
      const bytes = await readFile(path.join(process.cwd(), "public", asset.path.replace(/^\//, "")));
      expect(bytes.byteLength).toBe(asset.byteLength);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
    }
  });

  it("pairs the evidence with only the validated interview scenario", () => {
    expect(replayScenario.profile).toEqual({
      occasion: "interview",
      style: "classic",
      formality: "polished",
      budget: "mid",
      skinPersonalization: true,
    });
    expect(replayScenario.skinSummary).toEqual({ label: "radiance", score: 85 });
    expect(replayScenario.looks.map((look) => look.outfitId)).toEqual([
      "navy-tailoring",
      "cocoa-blazer-set",
      "graphite-set",
    ]);
  });

  it("keeps every catalog image resolvable and public demo media below 6 MiB", async () => {
    const catalogBytes = await Promise.all(catalog.map(async (outfit) => {
      const file = path.join(process.cwd(), "public", outfit.assetPath.replace(/^\//, ""));
      return (await stat(file)).size;
    }));
    const replayBytes = Object.values(replayAssets).reduce((total, asset) => total + asset.byteLength, 0);

    expect(catalog).toHaveLength(9);
    expect(catalogBytes.reduce((total, bytes) => total + bytes, 0) + replayBytes)
      .toBeLessThan(6 * 1024 * 1024);
  });
});
