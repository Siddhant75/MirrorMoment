// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMirrorMomentProvider } from "@/lib/server/provider";
import { YouCamError } from "@/lib/youcam/errors";

import { POST } from "./route";

vi.mock("@/lib/server/provider", () => ({ getMirrorMomentProvider: vi.fn() }));

function uploadRequest(file: File, purpose: "skin" | "clothes" = "skin") {
  const formData = new FormData();
  formData.set("purpose", purpose);
  formData.set("file", file);
  return new Request("http://localhost/api/uploads", { method: "POST", body: formData });
}

describe("POST /api/uploads", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects unsupported image types before provider use", async () => {
    const uploadPhoto = vi.fn();
    vi.mocked(getMirrorMomentProvider).mockReturnValue({ uploadPhoto } as never);

    const response = await POST(uploadRequest(new File(["text"], "face.txt", { type: "text/plain" })));

    expect(response.status).toBe(400);
    expect(uploadPhoto).not.toHaveBeenCalled();
  });

  it("rejects files at the 8 MiB limit", async () => {
    const uploadPhoto = vi.fn();
    vi.mocked(getMirrorMomentProvider).mockReturnValue({ uploadPhoto } as never);
    const response = await POST(uploadRequest(new File([
      new Uint8Array(8 * 1024 * 1024),
    ], "face.jpg", { type: "image/jpeg" })));

    expect(response.status).toBe(400);
    expect(uploadPhoto).not.toHaveBeenCalled();
  });

  it("returns the provider file reference for a valid upload", async () => {
    const uploadPhoto = vi.fn().mockResolvedValue({ fileId: "replay-face", purpose: "skin" });
    vi.mocked(getMirrorMomentProvider).mockReturnValue({ uploadPhoto } as never);
    const response = await POST(uploadRequest(new File(["face"], "face.jpg", { type: "image/jpeg" })));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ fileId: "replay-face", purpose: "skin" });
    expect(uploadPhoto).toHaveBeenCalledWith("skin", expect.objectContaining({
      name: "face.jpg",
      contentType: "image/jpeg",
    }));
  });

  it("surfaces a live provider failure without invoking a fallback", async () => {
    const uploadPhoto = vi.fn().mockRejectedValue(
      new YouCamError("vendor_unavailable", "The image service could not be reached."),
    );
    vi.mocked(getMirrorMomentProvider).mockReturnValue({ mode: "live", uploadPhoto } as never);

    const response = await POST(uploadRequest(new File(["face"], "face.jpg", { type: "image/jpeg" })));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "The image service could not be reached." });
    expect(getMirrorMomentProvider).toHaveBeenCalledTimes(1);
    expect(uploadPhoto).toHaveBeenCalledTimes(1);
  });
});
