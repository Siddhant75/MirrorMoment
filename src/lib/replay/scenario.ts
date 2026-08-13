import type { ShopperProfile, SkinSummary } from "@/lib/domain/types";

import generatedAssets from "./assets.generated.json";

export type ReplayAsset = {
  path: string;
  contentType: "image/jpeg";
  byteLength: number;
  sha256: string;
};

export type ReplayAssetKey =
  | "synthetic-face"
  | "synthetic-body"
  | "navy-tailoring-result"
  | "cocoa-blazer-set-result"
  | "graphite-set-result";

export const replayAssets = generatedAssets as Record<ReplayAssetKey, ReplayAsset>;

const profile: ShopperProfile = {
  occasion: "interview",
  style: "classic",
  formality: "polished",
  budget: "mid",
  skinPersonalization: true,
};

const skinSummary: SkinSummary = {
  label: "radiance",
  score: 85,
};

export const replayScenario = {
  profile,
  skinSummary,
  inputs: {
    face: {
      id: "synthetic-face",
      alt: "Synthetic front-facing face used for the recorded Skin Analysis replay",
      ...replayAssets["synthetic-face"],
    },
    body: {
      id: "synthetic-body",
      alt: "Synthetic full-body subject used for the recorded apparel try-on replay",
      ...replayAssets["synthetic-body"],
    },
  },
  looks: [
    {
      outfitId: "navy-tailoring",
      result: replayAssets["navy-tailoring-result"],
    },
    {
      outfitId: "cocoa-blazer-set",
      result: replayAssets["cocoa-blazer-set-result"],
    },
    {
      outfitId: "graphite-set",
      result: replayAssets["graphite-set-result"],
    },
  ],
} as const;
