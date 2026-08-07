import { selectLooks } from "@/lib/domain/recommendation";
import type { ShopperProfile } from "@/lib/domain/types";
import { normalizeYouCamErrorCode } from "@/lib/youcam/errors";
import type { TaskReference } from "@/lib/youcam/types";

import type { PlanJob, TaskAttempt } from "./types";

export type { PlanJob } from "./types";

type PlanClient = {
  createSkinTask: (faceFileId: string) => Promise<TaskReference>;
  createClothesTask: (bodyFileId: string, referenceFileId: string, category: "full_body") => Promise<TaskReference>;
};

export async function createPlanJob(
  profile: ShopperProfile,
  files: { faceFileId?: string; bodyFileId: string },
  client: PlanClient,
  referenceFileIdFor: (outfitId: string) => string | Promise<string>,
): Promise<PlanJob> {
  if (profile.skinPersonalization && !files.faceFileId) {
    throw new Error("A face selfie is required when skin personalization is enabled.");
  }

  const looks = selectLooks(profile);
  const skinPromises = profile.skinPersonalization
    ? [client.createSkinTask(files.faceFileId!)]
    : [];
  const lookPromises = looks.map(async (look) => {
    const referenceFileId = await referenceFileIdFor(look.id);
    return {
      ...(await client.createClothesTask(files.bodyFileId, referenceFileId, look.garmentCategory)),
      outfitId: look.id,
    };
  });
  const [skinResults, lookResults] = await Promise.all([
    Promise.allSettled(skinPromises),
    Promise.allSettled(lookPromises),
  ]);
  const skinResult = skinResults[0];
  const skinTask: TaskAttempt | undefined = skinResult
    ? skinResult.status === "fulfilled"
      ? skinResult.value
      : { status: "failed", errorCode: normalizeYouCamErrorCode(skinResult.reason) }
    : undefined;
  const lookTasks = lookResults.map((result, index) => result.status === "fulfilled"
    ? result.value
    : {
      status: "failed" as const,
      errorCode: normalizeYouCamErrorCode(result.reason),
      outfitId: looks[index].id,
    });

  return { skinTask, lookTasks };
}
