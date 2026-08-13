import { NextResponse } from "next/server";

import { createPlanJob } from "@/lib/plan/job";
import { parsePlanInput } from "@/lib/server/plan-input";
import { getMirrorMomentProvider } from "@/lib/server/provider";

export async function POST(request: Request) {
  try {
    const input = parsePlanInput(await request.json());
    const provider = getMirrorMomentProvider();
    const job = await createPlanJob(input.profile, input, provider);
    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create a plan." }, { status: 400 });
  }
}
