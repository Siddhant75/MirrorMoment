import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMirrorMomentProvider } from "@/lib/server/provider";

import { POST } from "./route";

vi.mock("@/lib/server/provider", () => ({ getMirrorMomentProvider: vi.fn() }));

function retryRequest(outfitId: string) {
  return new Request("http://localhost/api/look-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bodyFileId: "body-1", outfitId }),
  });
}

describe("POST /api/look-tasks", () => {
  beforeEach(() => vi.resetAllMocks());

  it("starts exactly one replacement look task", async () => {
    const startLookTask = vi.fn().mockResolvedValue({ taskId: "replacement-1" });
    vi.mocked(getMirrorMomentProvider).mockReturnValue({ startLookTask } as never);

    const response = await POST(retryRequest("navy-tailoring"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ taskId: "replacement-1", outfitId: "navy-tailoring" });
    expect(startLookTask).toHaveBeenCalledOnce();
    expect(startLookTask).toHaveBeenCalledWith("body-1", expect.objectContaining({ id: "navy-tailoring" }));
  });

  it("rejects unknown catalog IDs before provider use", async () => {
    const response = await POST(retryRequest("unknown-look"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "That catalog look is unavailable." });
    expect(getMirrorMomentProvider).not.toHaveBeenCalled();
  });
});
