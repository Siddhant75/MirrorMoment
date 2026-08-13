import type { Outfit } from "@/lib/domain/types";
import { YouCamClient } from "@/lib/youcam/client";

import { uploadCatalogReference } from "./catalog-reference";
import { LiveYouCamProvider } from "./providers/live-youcam";
import { RecordedReplayProvider } from "./providers/recorded-replay";
import type { MirrorMomentProvider } from "./providers/types";
import { readRuntimeMode } from "./runtime";

type ProviderEnvironment = Readonly<Record<string, string | undefined>>;

type ProviderFactoryOptions = {
  env?: ProviderEnvironment;
  fetcher?: typeof fetch;
  now?: () => number;
};

export function createMirrorMomentProvider({
  env = process.env,
  fetcher = fetch,
  now = Date.now,
}: ProviderFactoryOptions = {}): MirrorMomentProvider {
  const mode = readRuntimeMode(env);
  if (mode === "replay") return new RecordedReplayProvider(now);

  const apiKey = env.YOUCAM_API_KEY;
  if (!apiKey) {
    throw new Error("Live YouCam mode requires YOUCAM_API_KEY.");
  }
  const client = new YouCamClient(apiKey, fetcher);
  return new LiveYouCamProvider(
    client,
    (outfit: Outfit) => uploadCatalogReference(client, outfit),
  );
}

export function getMirrorMomentProvider() {
  return createMirrorMomentProvider();
}
