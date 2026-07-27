import { describe, expect, it, vi } from "vitest";

import { YouCamClient } from "./client";

describe("YouCamClient", () => {
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
});
