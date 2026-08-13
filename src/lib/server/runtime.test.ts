import { describe, expect, it } from "vitest";

import { getRuntimeInfo, readRuntimeMode } from "./runtime";

describe("runtime configuration", () => {
  it("defaults to recorded replay when no mode is configured", () => {
    expect(readRuntimeMode({})).toBe("replay");
    expect(getRuntimeInfo({})).toEqual({
      mode: "replay",
      label: "Recorded Judge Replay",
      acceptsCustomPhotos: false,
    });
  });

  it("selects live mode explicitly", () => {
    expect(readRuntimeMode({ MIRRORMOMENT_MODE: "live" })).toBe("live");
    expect(getRuntimeInfo({ MIRRORMOMENT_MODE: "live" })).toEqual({
      mode: "live",
      label: "Live YouCam",
      acceptsCustomPhotos: true,
    });
  });

  it("rejects unknown runtime modes", () => {
    expect(() => readRuntimeMode({ MIRRORMOMENT_MODE: "preview" }))
      .toThrow("MIRRORMOMENT_MODE must be replay or live.");
  });

  it("never exposes API-key state or values in the public descriptor", () => {
    const serialized = JSON.stringify(getRuntimeInfo({
      MIRRORMOMENT_MODE: "replay",
      YOUCAM_API_KEY: "server-secret-value",
    }));

    expect(serialized).not.toContain("server-secret-value");
    expect(serialized).not.toContain("YOUCAM_API_KEY");
    expect(serialized).not.toContain("key");
  });
});
