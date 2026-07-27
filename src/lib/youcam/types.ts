export type TaskStatus = "queued" | "processing" | "succeeded" | "failed";

export type TaskResult = {
  status: TaskStatus;
  resultUrl?: string;
  errorCode?: string;
};

export type TaskReference = {
  taskId: string;
};

export type UploadedVendorFile = {
  fileId: string;
  purpose: "skin" | "clothes";
};
