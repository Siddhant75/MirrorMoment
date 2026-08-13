import { NextResponse } from "next/server";
import { z } from "zod";

import { findCatalogOutfit } from "@/lib/server/catalog-reference";
import { getMirrorMomentProvider } from "@/lib/server/provider";

const retryInputSchema = z.object({ bodyFileId: z.string().min(1), outfitId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const input = retryInputSchema.parse(await request.json());
    const outfit = findCatalogOutfit(input.outfitId);
    if (!outfit) return NextResponse.json({ error: "That catalog look is unavailable." }, { status: 400 });

    const task = await getMirrorMomentProvider().startLookTask(input.bodyFileId, outfit);
    return NextResponse.json({ ...task, outfitId: outfit.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not retry this look." }, { status: 400 });
  }
}
