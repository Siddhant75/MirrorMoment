import type { Outfit, SkinSummary } from "@/lib/domain/types";
import type { RuntimeMode } from "@/lib/runtime/types";
import type { YouCamErrorCode } from "@/lib/youcam/errors";
import type { TaskReference, TaskStatus, UploadedVendorFile } from "@/lib/youcam/types";

export type PhotoUploadInput = {
  name: string;
  contentType: string;
  bytes: ArrayBuffer;
};

export type ProviderSkinTaskResult = {
  status: TaskStatus;
  summary?: SkinSummary | null;
  errorCode?: YouCamErrorCode;
};

export type ProviderLookTaskResult = {
  status: TaskStatus;
  resultUrl?: string;
  errorCode?: YouCamErrorCode;
};

export interface MirrorMomentProvider {
  readonly mode: RuntimeMode;
  uploadPhoto(purpose: "skin" | "clothes", input: PhotoUploadInput): Promise<UploadedVendorFile>;
  startSkinTask(faceFileId: string): Promise<TaskReference>;
  startLookTask(bodyFileId: string, outfit: Outfit): Promise<TaskReference>;
  readSkinTask(taskId: string): Promise<ProviderSkinTaskResult>;
  readLookTask(taskId: string): Promise<ProviderLookTaskResult>;
}
