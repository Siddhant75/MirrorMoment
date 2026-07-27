import { YouCamError } from "./errors";
import type { TaskReference, TaskResult, UploadedVendorFile } from "./types";

type Fetcher = typeof fetch;
type UploadInput = { name: string; contentType: string; bytes: ArrayBuffer };
type VendorTaskPayload = {
  data?: {
    task_id?: string;
    task_status?: string;
    error?: string | { code?: string } | null;
    results?: { url?: string };
  };
};

const baseUrl = "https://yce-api-01.makeupar.com";

function extractErrorCode(error: string | { code?: string } | null | undefined): string | undefined {
  return typeof error === "string" ? error : typeof error === "object" && error !== null ? error.code : undefined;
}

export class YouCamClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetcher: Fetcher = fetch,
  ) {}

  async createSkinTask(faceFileId: string): Promise<TaskReference> {
    return this.createTask("/s2s/v2.1/task/skin-analysis", { file_id: faceFileId });
  }

  async createClothesTask(bodyFileId: string, referenceFileId: string, garmentCategory: "full_body"): Promise<TaskReference> {
    return this.createTask("/s2s/v2.0/task/cloth-v3", {
      src_file_id: bodyFileId,
      ref_file_id: referenceFileId,
      garment_category: garmentCategory,
    });
  }

  async getSkinTask(taskId: string): Promise<TaskResult> {
    return this.getTask(`/s2s/v2.1/task/skin-analysis/${taskId}`);
  }

  async getClothesTask(taskId: string): Promise<TaskResult> {
    return this.getTask(`/s2s/v2.0/task/cloth-v3/${taskId}`);
  }

  async uploadFile(purpose: "skin" | "clothes", input: UploadInput): Promise<UploadedVendorFile> {
    const path = purpose === "skin" ? "/s2s/v2.1/file/skin-analysis" : "/s2s/v2.0/file/cloth-v3";
    const payload = await this.requestJson(path, {
      method: "POST",
      body: JSON.stringify({ files: [{ file_name: input.name, content_type: input.contentType }] }),
    }) as { data?: { files?: Array<{ file_id?: string; requests?: { url?: string } }>; requests?: Array<{ url?: string }> } };
    const file = payload.data?.files?.[0];
    const fileId = file?.file_id;
    const uploadUrl = file?.requests?.url ?? payload.data?.requests?.[0]?.url;

    if (!fileId || !uploadUrl) {
      throw new YouCamError("unexpected_error", "The image upload could not be prepared.");
    }

    const uploadResponse = await this.fetcher(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": input.contentType },
      body: input.bytes,
    });
    if (!uploadResponse.ok) {
      throw new YouCamError("vendor_unavailable", "The image upload service is unavailable.");
    }

    return { fileId, purpose };
  }

  private async createTask(path: string, body: Record<string, string>): Promise<TaskReference> {
    const payload = await this.requestJson(path, { method: "POST", body: JSON.stringify(body) }) as VendorTaskPayload;
    const taskId = payload.data?.task_id;
    if (!taskId) {
      throw new YouCamError("unexpected_error", "The image task could not be created.");
    }
    return { taskId };
  }

  private async getTask(path: string): Promise<TaskResult> {
    const payload = await this.requestJson(path, { method: "GET" }) as VendorTaskPayload;
    const status = payload.data?.task_status;

    if (status === "success") {
      const resultUrl = payload.data?.results?.url;
      return resultUrl ? { status: "succeeded", resultUrl } : { status: "failed", errorCode: "missing_result" };
    }
    if (status === "error" || payload.data?.error) {
      return { status: "failed", errorCode: extractErrorCode(payload.data?.error) ?? "task_failed" };
    }
    return { status: status === "queued" ? "queued" : "processing" };
  }

  private async requestJson(path: string, init: RequestInit): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetcher(`${baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
    } catch {
      throw new YouCamError("vendor_unavailable", "The image service could not be reached.");
    }

    if (!response.ok) {
      throw new YouCamError(response.status === 400 ? "invalid_image" : "vendor_unavailable", "The image service rejected this request.");
    }
    return response.json();
  }
}
