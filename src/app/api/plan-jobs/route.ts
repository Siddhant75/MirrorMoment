import { NextResponse } from "next/server";

import { selectLooks } from "@/lib/domain/recommendation";
import { createPlanJob } from "@/lib/plan/job";
import { uploadCatalogReference } from "@/lib/server/catalog-reference";
import { parsePlanInput } from "@/lib/server/plan-input";
import { getYouCamClient } from "@/lib/server/youcam";

export async function POST(request: Request) {
  try {
    const input = parsePlanInput(await request.json());
    const client = getYouCamClient();
    const looks = selectLooks(input.profile);
    const referenceEntries = await Promise.all(looks.map(async (look) => [look.id, await uploadCatalogReference(client, look)] as const));
    const references = new Map(referenceEntries);
    const job = await createPlanJob(input.profile, input, client, (outfitId) => references.get(outfitId) ?? "");
    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create a plan." }, { status: 400 });
  }
}
