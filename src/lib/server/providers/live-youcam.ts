import { summarizeSkinResult } from "@/lib/domain/skin-summary";
import type { Outfit } from "@/lib/domain/types";
import type { YouCamClient } from "@/lib/youcam/client";

import type {
  MirrorMomentProvider,
  PhotoUploadInput,
  ProviderLookTaskResult,
  ProviderSkinTaskResult,
} from "./types";

type LiveYouCamClient = Pick<YouCamClient,
  | "uploadFile"
  | "createSkinTask"
  | "createClothesTask"
  | "getSkinTask"
  | "getClothesTask"
>;

export class LiveYouCamProvider implements MirrorMomentProvider {
  readonly mode = "live" as const;

  constructor(
    private readonly client: LiveYouCamClient,
    private readonly referenceFileIdFor: (outfit: Outfit) => Promise<string>,
  ) {}

  uploadPhoto(purpose: "skin" | "clothes", input: PhotoUploadInput) {
    return this.client.uploadFile(purpose, input);
  }

  startSkinTask(faceFileId: string) {
    return this.client.createSkinTask(faceFileId);
  }

  async startLookTask(bodyFileId: string, outfit: Outfit) {
    const referenceFileId = await this.referenceFileIdFor(outfit);
    return this.client.createClothesTask(bodyFileId, referenceFileId, outfit.garmentCategory);
  }

  async readSkinTask(taskId: string): Promise<ProviderSkinTaskResult> {
    const result = await this.client.getSkinTask(taskId);
    if (result.status === "succeeded") {
      return {
        status: "succeeded",
        summary: summarizeSkinResult(result.vendorResult),
      };
    }
    return {
      status: result.status,
      ...(result.errorCode ? { errorCode: result.errorCode } : {}),
    };
  }

  async readLookTask(taskId: string): Promise<ProviderLookTaskResult> {
    const result = await this.client.getClothesTask(taskId);
    return {
      status: result.status,
      ...(result.resultUrl ? { resultUrl: result.resultUrl } : {}),
      ...(result.errorCode ? { errorCode: result.errorCode } : {}),
    };
  }
}
