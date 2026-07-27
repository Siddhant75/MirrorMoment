import { describe, expect, it } from "vitest";

import { parsePlanInput } from "./plan-input";

describe("parsePlanInput", () => {
  it("rejects cosmetic personalization without a face file id", () => {
    expect(() => parsePlanInput({
      profile: { occasion: "date", style: "bold", formality: "formal", budget: "premium", skinPersonalization: true },
      bodyFileId: "body-1",
    })).toThrow("A face selfie is required");
  });

  it("accepts an occasion-only plan without a face file id", () => {
    expect(parsePlanInput({
      profile: { occasion: "reset", style: "minimal", formality: "relaxed", budget: "value", skinPersonalization: false },
      bodyFileId: "body-1",
    })).toMatchObject({ bodyFileId: "body-1" });
  });
});
