import { NextResponse } from "next/server";
import { z } from "zod";

import { getYouCamClient } from "@/lib/server/youcam";

const taskSchema = z.object({ taskId: z.string().min(1) });
const statusInputSchema = z.object({
  skinTask: taskSchema.optional(),
  lookTasks: z.array(taskSchema.extend({ outfitId: z.string().min(1) })).length(3),
});

export async function POST(request: Request) {
  try {
    const input = statusInputSchema.parse(await request.json());
    const client = getYouCamClient();
    const [skin, looks] = await Promise.all([
      input.skinTask ? client.getSkinTask(input.skinTask.taskId) : undefined,
      Promise.all(input.lookTasks.map(async (look) => ({ outfitId: look.outfitId, ...(await client.getClothesTask(look.taskId)) }))),
    ]);
    return NextResponse.json({ skin, looks });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read task status." }, { status: 400 });
  }
}
