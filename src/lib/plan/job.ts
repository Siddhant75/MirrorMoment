import { selectLooks } from "@/lib/domain/recommendation";
import type { ShopperProfile } from "@/lib/domain/types";
import type { TaskReference } from "@/lib/youcam/types";

type PlanClient = {
  createSkinTask: (faceFileId: string) => Promise<TaskReference>;
  createClothesTask: (bodyFileId: string, referenceFileId: string, category: "full_body") => Promise<TaskReference>;
};

export type PlanJob = {
  skinTask?: TaskReference;
  lookTasks: Array<TaskReference & { outfitId: string }>;
};

export async function createPlanJob(
  profile: ShopperProfile,
  files: { faceFileId?: string; bodyFileId: string },
  client: PlanClient,
  referenceFileIdFor: (outfitId: string) => string,
): Promise<PlanJob> {
  if (profile.skinPersonalization && !files.faceFileId) {
    throw new Error("A face selfie is required when skin personalization is enabled.");
  }

  const looks = selectLooks(profile);
  const skinTask = profile.skinPersonalization ? await client.createSkinTask(files.faceFileId!) : undefined;
  const lookTasks = await Promise.all(
    looks.map(async (look) => ({
      ...(await client.createClothesTask(files.bodyFileId, referenceFileIdFor(look.id), look.garmentCategory)),
      outfitId: look.id,
    })),
  );

  return { skinTask, lookTasks };
}
