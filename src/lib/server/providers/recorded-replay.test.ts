// @vitest-environment node

import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { catalog } from "@/lib/domain/catalog";
import { replayScenario } from "@/lib/replay/scenario";

import { RecordedReplayProvider } from "./recorded-replay";

async function replayInput(kind: "face" | "body") {
  const asset = replayScenario.inputs[kind];
  const bytes = await readFile(path.join(process.cwd(), "public", asset.path.replace(/^\//, "")));
  return {
    name: path.basename(asset.path),
    contentType: asset.contentType,
    bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

describe("RecordedReplayProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts only the exact synthetic image for each upload purpose", async () => {
    const provider = new RecordedReplayProvider(() => 1_000_000);
    const face = await replayInput("face");
    const body = await replayInput("body");

    await expect(provider.uploadPhoto("skin", face)).resolves.toEqual({
      fileId: "replay-file:skin:synthetic-face",
      purpose: "skin",
    });
    await expect(provider.uploadPhoto("clothes", body)).resolves.toEqual({
      fileId: "replay-file:clothes:synthetic-body",
      purpose: "clothes",
    });

    const alteredBytes = face.bytes.slice(0);
    new Uint8Array(alteredBytes)[0] ^= 1;
    await expect(provider.uploadPhoto("skin", { ...face, bytes: alteredBytes }))
      .rejects.toMatchObject({ code: "invalid_image" });
    await expect(provider.uploadPhoto("skin", body))
      .rejects.toMatchObject({ code: "invalid_image" });
    await expect(provider.uploadPhoto("clothes", { ...body, contentType: "image/png" }))
      .rejects.toMatchObject({ code: "invalid_image" });
  });

  it("moves a Skin task deterministically from queued to processing to success", async () => {
    let clock = 1_000_000;
    const provider = new RecordedReplayProvider(() => clock);
    const task = await provider.startSkinTask("replay-file:skin:synthetic-face");

    await expect(provider.readSkinTask(task.taskId)).resolves.toEqual({ status: "queued" });
    clock += 1_000;
    await expect(provider.readSkinTask(task.taskId)).resolves.toEqual({ status: "processing" });
    clock += 3_000;
    await expect(provider.readSkinTask(task.taskId)).resolves.toEqual({
      status: "succeeded",
      summary: { label: "radiance", score: 85 },
    });
  });

  it("returns the recorded local result for each validated look", async () => {
    let clock = 2_000_000;
    const provider = new RecordedReplayProvider(() => clock);
    const expected = new Map(replayScenario.looks.map((look) => [look.outfitId, look.result.path]));

    for (const outfitId of expected.keys()) {
      const outfit = catalog.find((candidate) => candidate.id === outfitId)!;
      const task = await provider.startLookTask("replay-file:clothes:synthetic-body", outfit);
      await expect(provider.readLookTask(task.taskId)).resolves.toEqual({ status: "queued" });
      clock += 4_000;
      await expect(provider.readLookTask(task.taskId)).resolves.toEqual({
        status: "succeeded",
        resultUrl: expected.get(outfitId),
      });
    }
  });

  it("rejects wrong file IDs, unrecorded outfits, malformed tasks, and invalid task time", async () => {
    let clock = 3_000_000;
    const provider = new RecordedReplayProvider(() => clock);
    const unrecordedOutfit = catalog.find((outfit) => outfit.id === "ivory-jumpsuit")!;
    const navy = catalog.find((outfit) => outfit.id === "navy-tailoring")!;

    await expect(provider.startSkinTask("vendor-face-id"))
      .rejects.toMatchObject({ code: "invalid_image" });
    await expect(provider.startLookTask("vendor-body-id", navy))
      .rejects.toMatchObject({ code: "invalid_image" });
    await expect(provider.startLookTask("replay-file:clothes:synthetic-body", unrecordedOutfit))
      .rejects.toMatchObject({ code: "unexpected_error" });
    await expect(provider.readSkinTask("replay.not-valid-base64"))
      .rejects.toMatchObject({ code: "unexpected_error" });

    const skinTask = await provider.startSkinTask("replay-file:skin:synthetic-face");
    const lookTask = await provider.startLookTask("replay-file:clothes:synthetic-body", navy);
    await expect(provider.readSkinTask(lookTask.taskId))
      .rejects.toMatchObject({ code: "unexpected_error" });
    await expect(provider.readLookTask(skinTask.taskId))
      .rejects.toMatchObject({ code: "unexpected_error" });

    clock = 2_999_999;
    await expect(provider.readSkinTask(skinTask.taskId))
      .rejects.toMatchObject({ code: "unexpected_error" });
    clock = 3_120_001;
    await expect(provider.readSkinTask(skinTask.taskId))
      .rejects.toMatchObject({ code: "unexpected_error" });
  });

  it("never makes a network call", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    let clock = 4_000_000;
    const provider = new RecordedReplayProvider(() => clock);
    const face = await replayInput("face");
    const body = await replayInput("body");
    const navy = catalog.find((outfit) => outfit.id === "navy-tailoring")!;

    const uploadedFace = await provider.uploadPhoto("skin", face);
    const uploadedBody = await provider.uploadPhoto("clothes", body);
    const skinTask = await provider.startSkinTask(uploadedFace.fileId);
    const lookTask = await provider.startLookTask(uploadedBody.fileId, navy);
    clock += 4_000;
    await provider.readSkinTask(skinTask.taskId);
    await provider.readLookTask(lookTask.taskId);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
