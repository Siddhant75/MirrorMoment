import { describe, expect, it, vi } from "vitest";

import { catalog } from "@/lib/domain/catalog";
import type { YouCamClient } from "@/lib/youcam/client";

import { LiveYouCamProvider } from "./live-youcam";

function createClient() {
  return {
    uploadFile: vi.fn().mockResolvedValue({ fileId: "face-1", purpose: "skin" }),
    createSkinTask: vi.fn().mockResolvedValue({ taskId: "skin-1" }),
    createClothesTask: vi.fn().mockResolvedValue({ taskId: "look-1" }),
    getSkinTask: vi.fn().mockResolvedValue({ status: "processing" }),
    getClothesTask: vi.fn().mockResolvedValue({ status: "processing" }),
  } as unknown as YouCamClient;
}

describe("LiveYouCamProvider", () => {
  it("delegates uploads and task creation while keeping catalog uploads internal", async () => {
    const client = createClient();
    const referenceFileIdFor = vi.fn().mockResolvedValue("reference-1");
    const provider = new LiveYouCamProvider(client, referenceFileIdFor);
    const navy = catalog.find((outfit) => outfit.id === "navy-tailoring")!;
    const input = {
      name: "face.png",
      contentType: "image/png",
      bytes: new Uint8Array([1, 2, 3]).buffer,
    };

    expect(provider.mode).toBe("live");
    await expect(provider.uploadPhoto("skin", input)).resolves.toEqual({ fileId: "face-1", purpose: "skin" });
    await expect(provider.startSkinTask("face-1")).resolves.toEqual({ taskId: "skin-1" });
    await expect(provider.startLookTask("body-1", navy)).resolves.toEqual({ taskId: "look-1" });

    expect(client.uploadFile).toHaveBeenCalledWith("skin", input);
    expect(referenceFileIdFor).toHaveBeenCalledWith(navy);
    expect(client.createClothesTask).toHaveBeenCalledWith("body-1", "reference-1", "full_body");
  });

  it("returns only a normalized cosmetic summary for successful Skin Analysis", async () => {
    const client = createClient();
    vi.mocked(client.getSkinTask).mockResolvedValue({
      status: "succeeded",
      vendorResult: {
        data: {
          task_status: "success",
          results: {
            output: [{ type: "radiance", ui_score: 84, raw_score: 76.3, mask_urls: ["private-mask"] }],
          },
        },
      },
    });
    const provider = new LiveYouCamProvider(client, vi.fn());

    const result = await provider.readSkinTask("skin-1");

    expect(result).toEqual({
      status: "succeeded",
      summary: { label: "radiance", score: 84 },
    });
    expect(JSON.stringify(result)).not.toContain("raw_score");
    expect(JSON.stringify(result)).not.toContain("private-mask");
  });

  it("strips unrelated vendor data from Clothes task polling", async () => {
    const client = createClient();
    vi.mocked(client.getClothesTask).mockResolvedValue({
      status: "succeeded",
      resultUrl: "https://vendor.example/look.jpg",
      vendorResult: { internal: "must-not-escape" },
    });
    const provider = new LiveYouCamProvider(client, vi.fn());

    const result = await provider.readLookTask("look-1");

    expect(result).toEqual({
      status: "succeeded",
      resultUrl: "https://vendor.example/look.jpg",
    });
    expect(JSON.stringify(result)).not.toContain("must-not-escape");
  });
});
