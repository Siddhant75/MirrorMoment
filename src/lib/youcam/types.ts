import type { YouCamErrorCode } from "./errors";

export type TaskStatus = "queued" | "processing" | "succeeded" | "failed";

export type TaskResult = {
  status: TaskStatus;
  resultUrl?: string;
  errorCode?: YouCamErrorCode;
  vendorResult?: unknown;
};

export type TaskReference = {
  taskId: string;
};

export type UploadedVendorFile = {
  fileId: string;
  purpose: "skin" | "clothes";
};
