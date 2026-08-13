import { describe, expect, it, vi } from "vitest";

import { materializePhoto, type PhotoSelection } from "./photo-selection";

describe("materializePhoto", () => {
  it("returns a user-selected File without fetching", async () => {
    const file = new File(["face"], "face.png", { type: "image/png" });
    const fetcher = vi.fn<typeof fetch>();

    await expect(materializePhoto(file, fetcher)).resolves.toBe(file);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("loads a bundled replay image into a named JPEG File", async () => {
    const selection: Exclude<PhotoSelection, File | null> = {
      kind: "replay",
      url: "/replay/synthetic-face.jpg",
      name: "synthetic-face.jpg",
      contentType: "image/jpeg",
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("face-bytes", {
        status: 200,
        headers: { "Content-Type": "image/jpeg" },
      }),
    );

    const result = await materializePhoto(selection, fetcher);

    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe("synthetic-face.jpg");
    expect(result.type).toBe("image/jpeg");
    expect(result.size).toBeGreaterThan(0);
    expect(fetcher).toHaveBeenCalledWith("/replay/synthetic-face.jpg");
  });

  it("fails safely when a bundled image cannot be loaded", async () => {
    const selection: Exclude<PhotoSelection, File | null> = {
      kind: "replay",
      url: "/replay/synthetic-body.jpg",
      name: "synthetic-body.jpg",
      contentType: "image/jpeg",
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 404 }));

    await expect(materializePhoto(selection, fetcher))
      .rejects.toThrow("The bundled demo photo could not be loaded.");
  });
});
