import { expect, test } from "@playwright/test";

test("completes the recorded judge replay without an API key", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Recorded Judge Replay")).toBeVisible();
  await page.getByRole("button", { name: "Use demo selfie" }).click();
  await page.getByRole("button", { name: "Use demo full-body photo" }).click();
  await page.getByLabel("I consent to processing these photos for this session.").check();
  await page.getByRole("button", { name: "Create my confidence plan" }).click();

  await expect(page.getByAltText("Virtual try-on of Navy Tailoring")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Choose this look" })).toHaveCount(3);
  await page.getByRole("button", { name: "Choose this look" }).first().click();

  await expect(page.getByText("Cosmetic signal: Radiance 85/100")).toBeVisible();
  await expect(page.getByText("Demo price only. No sizing or fit assessment is provided.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Download plan" })).toBeVisible();
});

test("keeps the replay useful when Skin personalization is disabled", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Include optional cosmetic personalization in my plan.").uncheck();
  await page.getByRole("button", { name: "Use demo full-body photo" }).click();
  await page.getByLabel("I consent to processing these photos for this session.").check();
  await page.getByRole("button", { name: "Create my confidence plan" }).click();

  await expect(page.getByAltText("Virtual try-on of Navy Tailoring")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Choose this look" }).first().click();

  await expect(page.getByText("No Skin Analysis was used for this plan.")).toBeVisible();
  await expect(page.getByText("occasion-and-style personalized")).toBeVisible();
});
