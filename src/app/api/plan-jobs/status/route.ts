import { NextResponse } from "next/server";
import { z } from "zod";

import { getMirrorMomentProvider } from "@/lib/server/provider";
import { normalizeYouCamErrorCode } from "@/lib/youcam/errors";

const taskSchema = z.object({ taskId: z.string().min(1) });
const failedTaskSchema = z.object({
  status: z.literal("failed"),
  errorCode: z.enum(["invalid_image", "vendor_unavailable", "task_failed", "unexpected_error"]),
});
const statusInputSchema = z.object({
  skinTask: z.union([taskSchema, failedTaskSchema]).optional(),
  lookTasks: z.array(z.union([
    taskSchema.extend({ outfitId: z.string().min(1) }),
    failedTaskSchema.extend({ outfitId: z.string().min(1) }),
  ])).length(3),
});

function normalizeRejectedPoll(reason: unknown) {
  return { status: "processing" as const, errorCode: normalizeYouCamErrorCode(reason) };
}

export async function POST(request: Request) {
  try {
    const input = statusInputSchema.parse(await request.json());
    const provider = getMirrorMomentProvider();
    const skinPromise = input.skinTask
      ? "taskId" in input.skinTask
        ? provider.readSkinTask(input.skinTask.taskId)
        : Promise.resolve({ status: "failed" as const, errorCode: input.skinTask.errorCode })
      : undefined;
    const lookPromises = input.lookTasks.map(async (look) => (
      "taskId" in look
        ? { outfitId: look.outfitId, ...(await provider.readLookTask(look.taskId)) }
        : { outfitId: look.outfitId, status: "failed" as const, errorCode: look.errorCode }
    ));
    const [skinResults, lookResults] = await Promise.all([
      Promise.allSettled(skinPromise ? [skinPromise] : []),
      Promise.allSettled(lookPromises),
    ]);
    const skinResult = skinResults[0];
    const skin = skinResult
      ? skinResult.status === "fulfilled"
        ? skinResult.value
        : normalizeRejectedPoll(skinResult.reason)
      : undefined;
    const looks = lookResults.map((result, index) => result.status === "fulfilled"
      ? result.value
      : { outfitId: input.lookTasks[index].outfitId, ...normalizeRejectedPoll(result.reason) });
    return NextResponse.json({ skin, looks });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read task status." }, { status: 400 });
  }
}
