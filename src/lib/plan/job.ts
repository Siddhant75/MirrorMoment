import { selectLooks } from "@/lib/domain/recommendation";
import type { ShopperProfile } from "@/lib/domain/types";
import type { MirrorMomentProvider } from "@/lib/server/providers/types";
import { normalizeYouCamErrorCode } from "@/lib/youcam/errors";

import type { PlanJob, TaskAttempt } from "./types";

export type { PlanJob } from "./types";

type PlanProvider = Pick<MirrorMomentProvider, "startSkinTask" | "startLookTask">;

export async function createPlanJob(
  profile: ShopperProfile,
  files: { faceFileId?: string; bodyFileId: string },
  provider: PlanProvider,
): Promise<PlanJob> {
  if (profile.skinPersonalization && !files.faceFileId) {
    throw new Error("A face selfie is required when skin personalization is enabled.");
  }

  const looks = selectLooks(profile);
  const skinPromises = profile.skinPersonalization
    ? [provider.startSkinTask(files.faceFileId!)]
    : [];
  const lookPromises = looks.map(async (look) => {
    return {
      ...(await provider.startLookTask(files.bodyFileId, look)),
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
