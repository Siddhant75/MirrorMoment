export type YouCamErrorCode = "invalid_image" | "vendor_unavailable" | "task_failed" | "unexpected_error";

export class YouCamError extends Error {
  constructor(
    public readonly code: YouCamErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "YouCamError";
  }
}

export function normalizeYouCamErrorCode(error: unknown): YouCamErrorCode {
  return error instanceof YouCamError ? error.code : "unexpected_error";
}
