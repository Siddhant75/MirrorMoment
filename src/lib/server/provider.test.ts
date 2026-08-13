// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createMirrorMomentProvider } from "./provider";

describe("createMirrorMomentProvider", () => {
  it("selects replay by default without needing a key", () => {
    expect(createMirrorMomentProvider({ env: {} }).mode).toBe("replay");
  });

  it("requires a server key for explicit live mode", () => {
    expect(() => createMirrorMomentProvider({
      env: { MIRRORMOMENT_MODE: "live" },
    })).toThrow("Live YouCam mode requires YOUCAM_API_KEY.");
  });

  it("constructs the live provider only when both mode and key are present", () => {
    const fetcher = vi.fn<typeof fetch>();
    const provider = createMirrorMomentProvider({
      env: {
        MIRRORMOMENT_MODE: "live",
        YOUCAM_API_KEY: "server-secret-value",
      },
      fetcher,
    });

    expect(provider.mode).toBe("live");
    expect(fetcher).not.toHaveBeenCalled();
    expect(JSON.stringify(provider)).not.toContain("server-secret-value");
  });

  it("rejects unknown modes instead of guessing", () => {
    expect(() => createMirrorMomentProvider({
      env: { MIRRORMOMENT_MODE: "preview" },
    })).toThrow("MIRRORMOMENT_MODE must be replay or live.");
  });

  it("propagates a live vendor failure without substituting replay data", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline"));
    const provider = createMirrorMomentProvider({
      env: {
        MIRRORMOMENT_MODE: "live",
        YOUCAM_API_KEY: "server-secret-value",
      },
      fetcher,
    });

    await expect(provider.uploadPhoto("skin", {
      name: "face.jpg",
      contentType: "image/jpeg",
      bytes: new Uint8Array([1, 2, 3]).buffer,
    })).rejects.toMatchObject({ code: "vendor_unavailable" });
    expect(provider.mode).toBe("live");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
