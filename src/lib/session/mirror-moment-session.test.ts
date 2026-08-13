import { describe, expect, it } from "vitest";

import type { ShopperProfile } from "@/lib/domain/types";

import {
  MIRROR_MOMENT_SESSION_KEY,
  parseMirrorMomentSession,
  writeMirrorMomentSession,
} from "./mirror-moment-session";

const profile: ShopperProfile = {
  occasion: "interview",
  style: "classic",
  formality: "polished",
  budget: "mid",
  skinPersonalization: false,
};

function storedSession(mode: "replay" | "live", resultUrl: string) {
  return JSON.stringify({
    version: 2,
    mode,
    profile,
    job: {
      lookTasks: [
        { taskId: "look-1", outfitId: "navy-tailoring" },
        { taskId: "look-2", outfitId: "cocoa-blazer-set" },
        { taskId: "look-3", outfitId: "graphite-set" },
      ],
    },
    completedLooks: [{ outfitId: "navy-tailoring", resultUrl }],
  });
}

describe("MirrorMoment session storage", () => {
  it("restores only sessions created in the current runtime mode", () => {
    expect(parseMirrorMomentSession(storedSession("replay", "/replay/navy-tailoring-result.jpg"), "replay"))
      .toMatchObject({ version: 2, mode: "replay" });
    expect(parseMirrorMomentSession(storedSession("live", "https://vendor.example/navy.jpg"), "replay"))
      .toBeNull();
  });

  it("allows HTTPS vendor URLs and safe local replay paths", () => {
    expect(parseMirrorMomentSession(storedSession("live", "https://vendor.example/navy.jpg"), "live"))
      .not.toBeNull();
    expect(parseMirrorMomentSession(storedSession("replay", "/replay/navy-tailoring-result.jpg"), "replay"))
      .not.toBeNull();
  });

  it("rejects unsafe or unrelated result URL schemes", () => {
    expect(parseMirrorMomentSession(storedSession("replay", "javascript:alert(1)"), "replay"))
      .toBeNull();
    expect(parseMirrorMomentSession(storedSession("replay", "/catalog/navy-tailoring.jpg"), "replay"))
      .toBeNull();
    expect(parseMirrorMomentSession(storedSession("live", "http://vendor.example/navy.jpg"), "live"))
      .toBeNull();
  });

  it("writes version 2 sessions with their runtime mode and no image bytes", () => {
    const entries = new Map<string, string>();
    const storage = {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
      removeItem: (key: string) => entries.delete(key),
    };

    writeMirrorMomentSession(storage, "replay", profile, null, null);

    const raw = entries.get(MIRROR_MOMENT_SESSION_KEY)!;
    expect(JSON.parse(raw)).toEqual({
      version: 2,
      mode: "replay",
      profile,
      completedLooks: [],
    });
    expect(raw).not.toContain("data:image");
    expect(raw).not.toContain("blob:");
  });
});
