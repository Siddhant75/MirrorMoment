import { readFile } from "node:fs/promises";
import path from "node:path";

import { catalog } from "@/lib/domain/catalog";
import type { Outfit } from "@/lib/domain/types";
import type { YouCamClient } from "@/lib/youcam/client";

export function findCatalogOutfit(outfitId: string): Outfit | undefined {
  return catalog.find((outfit) => outfit.id === outfitId);
}

export async function uploadCatalogReference(client: YouCamClient, outfit: Outfit): Promise<string> {
  const relativeAssetPath = outfit.assetPath.replace(/^\//, "");
  const absoluteAssetPath = path.join(process.cwd(), "public", relativeAssetPath);
  const content = await readFile(absoluteAssetPath);
  const contentType = relativeAssetPath.endsWith(".png") ? "image/png" : "image/jpeg";
  const uploaded = await client.uploadFile("clothes", {
    name: path.basename(relativeAssetPath),
    contentType,
    bytes: content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer,
  });
  return uploaded.fileId;
}
