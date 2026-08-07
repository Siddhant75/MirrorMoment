import { YouCamError } from "./errors";
import type { TaskReference, TaskResult, UploadedVendorFile } from "./types";

type Fetcher = typeof fetch;
type UploadInput = { name: string; contentType: string; bytes: ArrayBuffer };
type VendorTaskPayload = {
  data?: {
    task_id?: string;
    task_status?: string;
    error?: string | { code?: string } | null;
    results?: unknown;
  };
};

const baseUrl = "https://yce-api-01.makeupar.com";

export class YouCamClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly requestTimeoutMs = 30_000,
  ) {}

  async createSkinTask(faceFileId: string): Promise<TaskReference> {
    return this.createTask("/s2s/v2.1/task/skin-analysis", {
      src_file_id: faceFileId,
      dst_actions: ["moisture", "radiance", "texture"],
      format: "json",
    });
  }

  async createClothesTask(bodyFileId: string, referenceFileId: string, garmentCategory: "full_body"): Promise<TaskReference> {
    return this.createTask("/s2s/v2.0/task/cloth-v3", {
      src_file_id: bodyFileId,
      ref_file_id: referenceFileId,
      garment_category: garmentCategory,
    });
  }

  async getSkinTask(taskId: string): Promise<TaskResult> {
    return this.getTask(`/s2s/v2.1/task/skin-analysis/${taskId}`, "skin");
  }

  async getClothesTask(taskId: string): Promise<TaskResult> {
    return this.getTask(`/s2s/v2.0/task/cloth-v3/${taskId}`, "clothes");
  }

  async uploadFile(purpose: "skin" | "clothes", input: UploadInput): Promise<UploadedVendorFile> {
    const path = purpose === "skin" ? "/s2s/v2.1/file/skin-analysis" : "/s2s/v2.0/file/cloth-v3";
    const payload = await this.requestJson(path, {
      method: "POST",
      body: JSON.stringify({
        files: [{
          file_name: input.name,
          content_type: input.contentType,
          file_size: input.bytes.byteLength,
        }],
      }),
    }) as {
      data?: {
        files?: Array<{
          file_id?: string;
          requests?: Array<{ url?: string; headers?: Record<string, string> }>;
        }>;
        requests?: Array<{ url?: string; headers?: Record<string, string> }>;
      };
    };
    const file = payload.data?.files?.[0];
    const fileId = file?.file_id;
    const uploadRequest = file?.requests?.[0] ?? payload.data?.requests?.[0];
    const uploadUrl = uploadRequest?.url;

    if (!fileId || !uploadUrl) {
      throw new YouCamError("unexpected_error", "The image upload could not be prepared.");
    }

    const uploadResponse = await this.fetchWithTimeout(uploadUrl, {
      method: "PUT",
      headers: uploadRequest.headers ?? { "Content-Type": input.contentType },
      body: input.bytes,
    }, "The image upload service could not be reached.");
    if (!uploadResponse.ok) {
      throw new YouCamError("vendor_unavailable", "The image upload service is unavailable.");
    }

    return { fileId, purpose };
  }

  private async createTask(path: string, body: Record<string, unknown>): Promise<TaskReference> {
    const payload = await this.requestJson(path, { method: "POST", body: JSON.stringify(body) }) as VendorTaskPayload;
    const taskId = payload.data?.task_id;
    if (!taskId) {
      throw new YouCamError("unexpected_error", "The image task could not be created.");
    }
    return { taskId };
  }

  private async getTask(path: string, kind: "skin" | "clothes"): Promise<TaskResult> {
    const payload = await this.requestJson(path, { method: "GET" }) as VendorTaskPayload;
    const status = payload.data?.task_status;

    if (status === "success") {
      if (kind === "skin") {
        return { status: "succeeded", vendorResult: payload };
      }
      const results = payload.data?.results;
      const resultUrl = typeof results === "object" && results !== null && "url" in results && typeof results.url === "string"
        ? results.url
        : undefined;
      return resultUrl ? { status: "succeeded", resultUrl } : { status: "failed", errorCode: "missing_result" };
    }
    if (status === "error" || payload.data?.error) {
      return { status: "failed", errorCode: "task_failed" };
    }
    return { status: status === "queued" ? "queued" : "processing" };
  }

  private async requestJson(path: string, init: RequestInit): Promise<unknown> {
    const response = await this.fetchWithTimeout(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    }, "The image service could not be reached.");

    if (!response.ok) {
      throw new YouCamError(response.status === 400 ? "invalid_image" : "vendor_unavailable", "The image service rejected this request.");
    }
    try {
      return await response.json();
    } catch {
      throw new YouCamError("unexpected_error", "The image service returned an unexpected response.");
    }
  }

  private async fetchWithTimeout(input: string, init: RequestInit, failureMessage: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      return await this.fetcher(input, { ...init, signal: controller.signal });
    } catch {
      throw new YouCamError("vendor_unavailable", failureMessage);
    } finally {
      clearTimeout(timeout);
    }
  }
}
