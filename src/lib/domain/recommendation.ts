import { beautyEdits, catalog } from "./catalog";
import type { BeautyEdit, ConfidencePlan, Outfit, ShopperProfile, SkinSummary } from "./types";

const formalityRank = { relaxed: 0, polished: 1, formal: 2 } as const;
const budgetRank = { value: 0, mid: 1, premium: 2 } as const;

function preferenceScore(outfit: Outfit, profile: ShopperProfile): number {
  const styleScore = outfit.styles.includes(profile.style) ? 100 : 0;
  const formalityScore = 20 - Math.abs(formalityRank[outfit.formality] - formalityRank[profile.formality]) * 8;
  const budgetScore = 10 - Math.abs(budgetRank[outfit.budget] - budgetRank[profile.budget]) * 4;

  return styleScore + formalityScore + budgetScore;
}

export function selectLooks(profile: ShopperProfile): Outfit[] {
  return catalog
    .filter((outfit) => outfit.occasions.includes(profile.occasion))
    .sort((left, right) => preferenceScore(right, profile) - preferenceScore(left, profile) || left.id.localeCompare(right.id))
    .slice(0, 3);
}

function selectBeautyEdit(looks: Outfit[], skinSummary: SkinSummary | null): BeautyEdit {
  const lookTags = new Set(looks.flatMap((look) => look.beautyTags));
  const matchingSkinEdit = skinSummary
    ? beautyEdits.find((edit) => edit.tags.includes(skinSummary.label.toLowerCase()))
    : undefined;

  return matchingSkinEdit ?? beautyEdits.find((edit) => edit.tags.some((tag) => lookTags.has(tag))) ?? beautyEdits[3];
}

export function buildConfidencePlan(profile: ShopperProfile, skinSummary: SkinSummary | null): ConfidencePlan {
  const looks = selectLooks(profile);
  const useSkinSummary = profile.skinPersonalization && skinSummary !== null;

  return {
    looks,
    beautyEdit: selectBeautyEdit(looks, useSkinSummary ? skinSummary : null),
    personalizationLabel: useSkinSummary ? "skin-and-style personalized" : "occasion-and-style personalized",
    explanation: useSkinSummary
      ? "Your options bring together your occasion, style preferences, and the cosmetic personalization you enabled."
      : "Your options are personalized to your occasion and style preferences.",
  };
}
