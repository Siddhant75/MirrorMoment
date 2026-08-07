import { NextResponse } from "next/server";

import { createPlanJob } from "@/lib/plan/job";
import { findCatalogOutfit, uploadCatalogReference } from "@/lib/server/catalog-reference";
import { parsePlanInput } from "@/lib/server/plan-input";
import { getYouCamClient } from "@/lib/server/youcam";

export async function POST(request: Request) {
  try {
    const input = parsePlanInput(await request.json());
    const client = getYouCamClient();
    const job = await createPlanJob(input.profile, input, client, async (outfitId) => {
      const outfit = findCatalogOutfit(outfitId);
      if (!outfit) throw new Error("That catalog look is unavailable.");
      return uploadCatalogReference(client, outfit);
    });
    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create a plan." }, { status: 400 });
  }
}
