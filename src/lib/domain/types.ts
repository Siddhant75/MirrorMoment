export const occasions = ["interview", "wedding", "date", "reset"] as const;
export const styles = ["classic", "bold", "minimal"] as const;
export const formalities = ["relaxed", "polished", "formal"] as const;
export const budgets = ["value", "mid", "premium"] as const;

export type Occasion = (typeof occasions)[number];
export type Style = (typeof styles)[number];
export type Formality = (typeof formalities)[number];
export type Budget = (typeof budgets)[number];

export type ShopperProfile = {
  occasion: Occasion;
  style: Style;
  formality: Formality;
  budget: Budget;
  skinPersonalization: boolean;
};

export type Outfit = {
  id: string;
  title: string;
  description: string;
  occasions: Occasion[];
  styles: Style[];
  formality: Formality;
  budget: Budget;
  garmentCategory: "full_body";
  assetPath: string;
  beautyTags: string[];
};

export type BeautyEdit = {
  id: string;
  title: string;
  description: string;
  tags: string[];
};

export type SkinSummary = {
  label: string;
  score: number;
};

export type ConfidencePlan = {
  looks: Outfit[];
  beautyEdit: BeautyEdit;
  personalizationLabel: "skin-and-style personalized" | "occasion-and-style personalized";
  explanation: string;
};
