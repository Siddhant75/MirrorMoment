import type { SkinSummary } from "./types";

type ScoreRecord = { score?: unknown };

const cosmeticLabels: Record<string, SkinSummary["label"]> = {
  hydration: "hydration",
  moisture: "hydration",
  hd_moisture: "hydration",
  radiance: "radiance",
  hd_radiance: "radiance",
  texture: "texture",
  hd_texture: "texture",
};

function isScoreRecord(value: unknown): value is ScoreRecord {
  return typeof value === "object" && value !== null;
}

export function summarizeSkinResult(payload: unknown): SkinSummary | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const data = "data" in payload ? payload.data : null;
  if (typeof data !== "object" || data === null || !("results" in data) || typeof data.results !== "object" || data.results === null) {
    return null;
  }

  const results = data.results;
  const documentedOutput = "output" in results && Array.isArray(results.output)
    ? results.output.flatMap((entry) => {
      if (typeof entry !== "object" || entry === null || !("type" in entry) || !("ui_score" in entry)) return [];
      const label = typeof entry.type === "string" ? cosmeticLabels[entry.type.toLowerCase()] : undefined;
      return label && typeof entry.ui_score === "number" && Number.isFinite(entry.ui_score)
        ? [{ label, score: entry.ui_score }]
        : [];
    })
    : [];

  const legacyOutput = Object.entries(results)
    .filter((entry): entry is [string, ScoreRecord] => isScoreRecord(entry[1]))
    .flatMap(([vendorLabel, result]) => {
      const label = cosmeticLabels[vendorLabel.toLowerCase()];
      return label && typeof result.score === "number" && Number.isFinite(result.score)
        ? [{ label, score: result.score }]
        : [];
    });

  const summaries = [...documentedOutput, ...legacyOutput];

  return summaries.sort((left, right) => right.score - left.score)[0] ?? null;
}
