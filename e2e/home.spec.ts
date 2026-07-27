import { expect, test } from "@playwright/test";

test("shows the confidence-plan entry flow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "A look that meets the moment." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create my confidence plan" })).toBeDisabled();
  await expect(page.getByText("A full-body photo is required to create virtual looks.")).toBeVisible();
});
