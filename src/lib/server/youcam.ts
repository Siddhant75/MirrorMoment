import { YouCamClient } from "@/lib/youcam/client";

export function getYouCamClient() {
  const apiKey = process.env.YOUCAM_API_KEY;
  if (!apiKey) {
    throw new Error("The server is missing YOUCAM_API_KEY.");
  }
  return new YouCamClient(apiKey);
}
