import { z } from "zod";

import { budgets, formalities, occasions, styles, type ShopperProfile } from "@/lib/domain/types";

const profileSchema = z.object({
  occasion: z.enum(occasions),
  style: z.enum(styles),
  formality: z.enum(formalities),
  budget: z.enum(budgets),
  skinPersonalization: z.boolean(),
});

const planInputSchema = z.object({
  profile: profileSchema,
  faceFileId: z.string().min(1).optional(),
  bodyFileId: z.string().min(1),
});

export type PlanInput = {
  profile: ShopperProfile;
  faceFileId?: string;
  bodyFileId: string;
};

export function parsePlanInput(input: unknown): PlanInput {
  const parsed = planInputSchema.parse(input);
  if (parsed.profile.skinPersonalization && !parsed.faceFileId) {
    throw new Error("A face selfie is required when cosmetic personalization is enabled.");
  }
  return parsed;
}
