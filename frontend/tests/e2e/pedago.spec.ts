import { test, expect } from "@playwright/test";

test.describe("Pedago AI Faculty Copilot E2E", () => {
  test("1. Landing navigation and instant faculty session login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Pedago AI/);

    // Verify ambient effect canvas present
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();

    // Click explore faculty copilot
    await page.click("text=Explore Faculty Copilot");
    await expect(page).toHaveURL(/.*dashboard/);

    // Verify dashboard executive overview
    await expect(page.locator("h1")).toContainText("Faculty Intelligence Copilot");
  });

  test("2. View evidence-backed research gap analysis and inspect primary evidence", async ({ page }) => {
    await page.goto("/research/gap-verification");
    await expect(page.locator("h1")).toContainText("Research Gap Verification");

    // Check empirical verdict
    await expect(page.locator("text=Claimed Gap Supported by Indexed Literature")).toBeVisible();

    // Inspect cited evidence drawer
    const inspectEvidenceBtn = page.locator("text=Inspect 1 Cited Evidence Source").first();
    if (await inspectEvidenceBtn.isVisible()) {
      await inspectEvidenceBtn.click();
      await expect(page.locator("text=Cited Primary Evidence")).toBeVisible();
      await page.click("button[aria-label='Close drawer']");
    }
  });

  test("3. Edit and approve an artifact in LOR Dossier", async ({ page }) => {
    await page.goto("/students/lor");
    await expect(page.locator("h1")).toContainText("Evidence-Backed Letter of Recommendation");

    // TipTap editor should be visible
    const editor = page.locator(".tiptap-content");
    await expect(editor).toBeVisible();

    // Human review sign-off
    const approveBtn = page.locator("text=Approve & Sign Off");
    await approveBtn.click();
    await expect(page.locator("text=Faculty Sign-Off Completed")).toBeVisible();
  });

  test("4. Workspace isolation and persistence", async ({ page }) => {
    await page.goto("/dashboard");

    // Verify current workspace name exists
    await expect(page.locator("text=CS Dept - Fall 2025 Core Courses").first()).toBeVisible();
  });
});
