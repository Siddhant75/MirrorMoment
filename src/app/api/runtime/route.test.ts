import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("GET /api/runtime", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns only the safe replay descriptor by default", async () => {
    vi.stubEnv("MIRRORMOMENT_MODE", "");
    vi.stubEnv("YOUCAM_API_KEY", "server-secret-value");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      mode: "replay",
      label: "Recorded Judge Replay",
      acceptsCustomPhotos: false,
    });
    expect(JSON.stringify(body)).not.toContain("server-secret-value");
  });

  it("fails safely when runtime mode is invalid", async () => {
    vi.stubEnv("MIRRORMOMENT_MODE", "preview");

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "MirrorMoment runtime is misconfigured.",
    });
  });
});
