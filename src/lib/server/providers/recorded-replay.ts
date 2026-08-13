import { createHash } from "node:crypto";

import { z } from "zod";

import type { Outfit } from "@/lib/domain/types";
import { replayScenario } from "@/lib/replay/scenario";
import { YouCamError } from "@/lib/youcam/errors";
import type { TaskStatus } from "@/lib/youcam/types";

import type {
  MirrorMomentProvider,
  PhotoUploadInput,
  ProviderLookTaskResult,
  ProviderSkinTaskResult,
} from "./types";

const replayFaceFileId = "replay-file:skin:synthetic-face";
const replayBodyFileId = "replay-file:clothes:synthetic-body";
const maximumTaskAgeMs = 120_000;

const skinTaskSchema = z.object({
  v: z.literal(1),
  kind: z.literal("skin"),
  createdAt: z.number().int().nonnegative(),
}).strict();

const lookTaskSchema = z.object({
  v: z.literal(1),
  kind: z.literal("look"),
  createdAt: z.number().int().nonnegative(),
  outfitId: z.enum(["navy-tailoring", "cocoa-blazer-set", "graphite-set"]),
}).strict();

const replayTaskSchema = z.discriminatedUnion("kind", [skinTaskSchema, lookTaskSchema]);
type ReplayTask = z.infer<typeof replayTaskSchema>;

function replayError(message: string) {
  return new YouCamError("unexpected_error", message);
}

function sha256(bytes: ArrayBuffer) {
  return createHash("sha256").update(new Uint8Array(bytes)).digest("hex");
}

function encodeTask(task: ReplayTask) {
  return `replay.${Buffer.from(JSON.stringify(task), "utf8").toString("base64url")}`;
}

function decodeTask(taskId: string): ReplayTask {
  try {
    if (!taskId.startsWith("replay.")) throw new Error("invalid prefix");
    const encoded = taskId.slice("replay.".length);
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    return replayTaskSchema.parse(JSON.parse(decoded));
  } catch {
    throw replayError("The recorded task reference is invalid.");
  }
}

function taskStatus(createdAt: number, now: number): TaskStatus {
  const elapsed = now - createdAt;
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > maximumTaskAgeMs) {
    throw replayError("The recorded task reference has expired.");
  }
  if (elapsed < 1_000) return "queued";
  if (elapsed < 4_000) return "processing";
  return "succeeded";
}

export class RecordedReplayProvider implements MirrorMomentProvider {
  readonly mode = "replay" as const;

  constructor(private readonly now: () => number = Date.now) {}

  async uploadPhoto(purpose: "skin" | "clothes", input: PhotoUploadInput) {
    const expected = purpose === "skin"
      ? replayScenario.inputs.face
      : replayScenario.inputs.body;
    if (input.contentType !== expected.contentType || sha256(input.bytes) !== expected.sha256) {
      throw new YouCamError(
        "invalid_image",
        "Recorded replay accepts only its bundled synthetic demo photo.",
      );
    }
    return {
      fileId: purpose === "skin" ? replayFaceFileId : replayBodyFileId,
      purpose,
    };
  }

  async startSkinTask(faceFileId: string) {
    if (faceFileId !== replayFaceFileId) {
      throw new YouCamError("invalid_image", "The recorded face reference is invalid.");
    }
    return {
      taskId: encodeTask({ v: 1, kind: "skin", createdAt: this.now() }),
    };
  }

  async startLookTask(bodyFileId: string, outfit: Outfit) {
    if (bodyFileId !== replayBodyFileId) {
      throw new YouCamError("invalid_image", "The recorded body reference is invalid.");
    }
    const recordedLook = replayScenario.looks.find((look) => look.outfitId === outfit.id);
    if (!recordedLook) {
      throw replayError("That look is not part of the recorded judge scenario.");
    }
    return {
      taskId: encodeTask({
        v: 1,
        kind: "look",
        createdAt: this.now(),
        outfitId: recordedLook.outfitId,
      }),
    };
  }

  async readSkinTask(taskId: string): Promise<ProviderSkinTaskResult> {
    const task = decodeTask(taskId);
    if (task.kind !== "skin") {
      throw replayError("The recorded task type is invalid.");
    }
    const status = taskStatus(task.createdAt, this.now());
    return status === "succeeded"
      ? { status, summary: replayScenario.skinSummary }
      : { status };
  }

  async readLookTask(taskId: string): Promise<ProviderLookTaskResult> {
    const task = decodeTask(taskId);
    if (task.kind !== "look") {
      throw replayError("The recorded task type is invalid.");
    }
    const status = taskStatus(task.createdAt, this.now());
    if (status !== "succeeded") return { status };

    const look = replayScenario.looks.find((candidate) => candidate.outfitId === task.outfitId);
    if (!look) {
      throw replayError("The recorded look result is unavailable.");
    }
    return { status, resultUrl: look.result.path };
  }
}
