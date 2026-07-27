import type { SkinSummary } from "./types";

type ScoreRecord = { score?: unknown };

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

  const summaries = Object.entries(data.results)
    .filter((entry): entry is [string, ScoreRecord] => isScoreRecord(entry[1]))
    .map(([label, result]) => ({ label, score: result.score }))
    .filter((entry): entry is SkinSummary => typeof entry.score === "number" && Number.isFinite(entry.score));

  return summaries.sort((left, right) => right.score - left.score)[0] ?? null;
}
