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
