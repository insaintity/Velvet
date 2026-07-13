import { expect, test } from "@playwright/test";

test.describe("Velvet Coda dashboard", () => {
  test("renders the first-launch studio shell", async ({ page }, testInfo) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("link", { name: "V Velvet AI ALBUM FOUNDRY" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create your first AI jazz album." })).toBeVisible();
    await expect(page.getByText("No album has been created yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Play|Pause/ })).toBeVisible();

    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach(`dashboard-${testInfo.project.name}.png`, {
      body: screenshot,
      contentType: "image/png"
    });
  });

  test("renders the guided new-project flow", async ({ page }) => {
    await page.goto("/projects/new");

    await expect(page.getByRole("heading", { name: "Describe the album." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Blueprint" })).toBeVisible();
    await expect(page.getByText("ChatGPT and ElevenLabs calls stay blocked until approved.")).toBeVisible();
  });

  test("shows focused onboarding for ChatGPT, ElevenLabs and YouTube", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: "Onboarding" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "ChatGPT / OpenAI" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "ElevenLabs" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "YouTube" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Login to YouTube" })).toHaveAttribute("href", "/api/youtube/login");
    await expect(page.getByRole("button", { name: "Save Setup" })).toBeVisible();
  });

  test("returns to settings when YouTube OAuth is not configured", async ({ page }) => {
    await page.goto("/api/youtube/login");

    await expect(page).toHaveURL(/\/settings\?youtube=missing_config/);
    await expect(page.getByText("YouTube login needs GOOGLE_CLIENT_ID")).toBeVisible();
  });

  test("keeps onboarding step labels inside their boxes", async ({ page }) => {
    await page.goto("/settings");

    const visibleStepCards = page.locator('[data-testid="onboarding-step"]');
    await expect(visibleStepCards).toHaveCount(5);
    const cardsFit = await visibleStepCards.evaluateAll((cards) =>
      cards.every((card) => {
        const bounds = card.getBoundingClientRect();
        return Array.from(card.children).every((child) => {
          const childBounds = child.getBoundingClientRect();
          return childBounds.top >= bounds.top && childBounds.bottom <= bounds.bottom;
        });
      })
    );

    expect(cardsFit).toBe(true);
  });

  test("shows upload history with prompt archive fields", async ({ page }) => {
    await page.goto("/history");

    await expect(page.getByRole("heading", { name: "Upload History" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No uploads yet" })).toBeVisible();
    await expect(page.getByText("Track music prompts")).toBeVisible();
    await expect(page.getByText("YouTube metadata prompt")).toBeVisible();
  });

  test("keeps primary pages inside the fixed studio frame", async ({ page }) => {
    for (const path of ["/dashboard", "/projects/new", "/projects", "/history", "/settings"]) {
      await page.goto(path);
      const hasScroll = await page.evaluate(() => {
        const root = document.scrollingElement ?? document.documentElement;
        return root.scrollHeight > root.clientHeight + 1 || root.scrollWidth > root.clientWidth + 1;
      });

      expect(hasScroll, `${path} should not create page scroll`).toBe(false);
    }
  });
});
