import { z } from "zod";

import { budgets, formalities, occasions, styles, type ShopperProfile, type SkinSummary } from "@/lib/domain/types";
import type { PlanJob } from "@/lib/plan/types";

export type { PlanJob } from "@/lib/plan/types";
export type { TaskReference } from "@/lib/youcam/types";

export const MIRROR_MOMENT_SESSION_KEY = "mirrormoment-session";

export type TaskState = "queued" | "processing" | "succeeded" | "failed";
export type JobStatus = {
  skin?: { status: TaskState; summary?: SkinSummary | null; errorCode?: string };
  looks: Array<{ outfitId: string; status: TaskState; resultUrl?: string; errorCode?: string }>;
};

export type StoredSession = {
  version: 1;
  profile: ShopperProfile;
  job?: PlanJob;
  completedLooks: Array<{ outfitId: string; resultUrl: string }>;
};

type SessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const taskReferenceSchema = z.object({ taskId: z.string().min(1) });
const failedTaskAttemptSchema = z.object({
  status: z.literal("failed"),
  errorCode: z.enum(["invalid_image", "vendor_unavailable", "task_failed", "unexpected_error"]),
});
const taskAttemptSchema = z.union([taskReferenceSchema, failedTaskAttemptSchema]);
const lookTaskAttemptSchema = z.union([
  taskReferenceSchema.extend({ outfitId: z.string().min(1) }),
  failedTaskAttemptSchema.extend({ outfitId: z.string().min(1) }),
]);
const profileSchema = z.object({
  occasion: z.enum(occasions),
  style: z.enum(styles),
  formality: z.enum(formalities),
  budget: z.enum(budgets),
  skinPersonalization: z.boolean(),
});
const storedSessionSchema = z.object({
  version: z.literal(1),
  profile: profileSchema,
  job: z.object({
    skinTask: taskAttemptSchema.optional(),
    lookTasks: z.array(lookTaskAttemptSchema).length(3),
  }).optional(),
  completedLooks: z.array(z.object({ outfitId: z.string().min(1), resultUrl: z.url() })),
});

export function parseMirrorMomentSession(raw: string | null): StoredSession | null {
  if (!raw) return null;

  try {
    const parsed = storedSessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function readMirrorMomentSession(storage: SessionStorage): StoredSession | null {
  return parseMirrorMomentSession(storage.getItem(MIRROR_MOMENT_SESSION_KEY));
}

export function writeMirrorMomentSession(
  storage: SessionStorage,
  profile: ShopperProfile,
  job: PlanJob | null,
  status: JobStatus | null,
) {
  const completedLooks = status?.looks.flatMap((look) => (
    look.status === "succeeded" && look.resultUrl
      ? [{ outfitId: look.outfitId, resultUrl: look.resultUrl }]
      : []
  )) ?? [];

  const session: StoredSession = {
    version: 1,
    profile,
    ...(job ? { job } : {}),
    completedLooks,
  };
  storage.setItem(MIRROR_MOMENT_SESSION_KEY, JSON.stringify(session));
}

export function removeMirrorMomentSession(storage: SessionStorage) {
  storage.removeItem(MIRROR_MOMENT_SESSION_KEY);
  storage.removeItem("mirrormoment-profile");
}
