import { afterEach, describe, expect, it, vi } from "vitest";

import { YouCamClient } from "./client";

describe("YouCamClient", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes and uploads a file using the documented metadata and nested presigned request", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          files: [{
            file_id: "uploaded-file",
            requests: [{
              method: "PUT",
              url: "https://uploads.example/presigned",
              headers: { "Content-Type": "image/png", "Content-Length": "4" },
            }],
          }],
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const client = new YouCamClient("secret-key", fetcher);

    await expect(client.uploadFile("skin", {
      name: "selfie.png",
      contentType: "image/png",
      bytes,
    })).resolves.toEqual({ fileId: "uploaded-file", purpose: "skin" });

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "https://yce-api-01.makeupar.com/s2s/v2.1/file/skin-analysis",
      expect.objectContaining({
        body: JSON.stringify({
          files: [{ file_name: "selfie.png", content_type: "image/png", file_size: 4 }],
        }),
      }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://uploads.example/presigned",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "image/png", "Content-Length": "4" },
        body: bytes,
      }),
    );
  });

  it("creates a Skin Analysis v2.1 JSON task with the supported cosmetic actions", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { task_id: "skin-task" } }), { status: 200 }),
    );
    const client = new YouCamClient("secret-key", fetcher);

    await expect(client.createSkinTask("face-file")).resolves.toEqual({ taskId: "skin-task" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://yce-api-01.makeupar.com/s2s/v2.1/task/skin-analysis",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          src_file_id: "face-file",
          dst_actions: ["moisture", "radiance", "texture"],
          format: "json",
        }),
      }),
    );
  });

  it("normalizes a successful skin task without requiring a VTO image URL", async () => {
    const vendorPayload = {
      data: {
        task_status: "success",
        results: {
          output: [{ type: "moisture", ui_score: 88, raw_score: 82.4, mask_urls: [] }],
        },
      },
    };
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(vendorPayload), { status: 200 }),
    );
    const client = new YouCamClient("secret-key", fetcher);

    const result = await client.getSkinTask("skin-task");

    expect(result).toEqual({ status: "succeeded", vendorResult: vendorPayload });
    expect(JSON.stringify(result)).not.toContain("secret-key");
  });

  it("normalizes a successful clothes task into a safe result URL", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            task_status: "success",
            results: { url: "https://vendor.example/results/look.png" },
          },
        }),
        { status: 200 },
      ),
    );
    const client = new YouCamClient("secret-key", fetcher);

    const result = await client.getClothesTask("look-task");

    expect(result).toEqual({ status: "succeeded", resultUrl: "https://vendor.example/results/look.png" });
  });

  it("creates a clothes task with source, reference, and garment category", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { task_id: "created-task" } }), { status: 200 }),
    );
    const client = new YouCamClient("secret-key", fetcher);

    await expect(client.createClothesTask("body-file", "reference-file", "full_body")).resolves.toEqual({ taskId: "created-task" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://yce-api-01.makeupar.com/s2s/v2.0/task/cloth-v3",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          src_file_id: "body-file",
          ref_file_id: "reference-file",
          garment_category: "full_body",
        }),
      }),
    );
  });

  it("normalizes a vendor task error without exposing vendor-specific copy", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        data: { task_status: "error", error: { code: "vendor_internal_face_code" } },
      }), { status: 200 }),
    );
    const client = new YouCamClient("secret-key", fetcher);

    await expect(client.getSkinTask("skin-task")).resolves.toEqual({
      status: "failed",
      errorCode: "task_failed",
    });
  });

  it("maps a failed presigned upload request to a safe vendor-unavailable error", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          files: [{
            file_id: "uploaded-file",
            requests: [{ url: "https://uploads.example/presigned", headers: { "Content-Type": "image/png" } }],
          }],
        },
      }), { status: 200 }))
      .mockRejectedValueOnce(new TypeError("socket details that must not escape"));
    const client = new YouCamClient("secret-key", fetcher);

    await expect(client.uploadFile("skin", {
      name: "selfie.png",
      contentType: "image/png",
      bytes: new Uint8Array([1]).buffer,
    })).rejects.toMatchObject({
      code: "vendor_unavailable",
      message: "The image upload service could not be reached.",
    });
  });

  it("aborts a vendor request after the configured timeout", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }));
    const client = new YouCamClient("secret-key", fetcher, 25);

    const request = client.createSkinTask("face-file");
    const rejection = expect(request).rejects.toMatchObject({ code: "vendor_unavailable" });
    await vi.advanceTimersByTimeAsync(25);

    await rejection;
  });
});
