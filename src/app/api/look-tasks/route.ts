import { NextResponse } from "next/server";
import { z } from "zod";

import { findCatalogOutfit, uploadCatalogReference } from "@/lib/server/catalog-reference";
import { getYouCamClient } from "@/lib/server/youcam";

const retryInputSchema = z.object({ bodyFileId: z.string().min(1), outfitId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const input = retryInputSchema.parse(await request.json());
    const outfit = findCatalogOutfit(input.outfitId);
    if (!outfit) return NextResponse.json({ error: "That catalog look is unavailable." }, { status: 400 });

    const client = getYouCamClient();
    const referenceFileId = await uploadCatalogReference(client, outfit);
    const task = await client.createClothesTask(input.bodyFileId, referenceFileId, outfit.garmentCategory);
    return NextResponse.json({ ...task, outfitId: outfit.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not retry this look." }, { status: 400 });
  }
}
