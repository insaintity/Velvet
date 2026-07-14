import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const fixtureProjectId = "playwright-blueprint";

async function writeFixtureDatabase() {
  const velvetDirectory = path.join(process.cwd(), ".velvet");
  const databaseFile = path.join(velvetDirectory, "db.json");
  await mkdir(velvetDirectory, { recursive: true });
  await writeFile(
    databaseFile,
    `${JSON.stringify(
      {
        setup: {},
        projects: [
          {
            id: fixtureProjectId,
            title: "Midnight Velvet",
            brief: "A late-night jazz album with piano, saxophone and brushed drums.",
            status: "blueprint",
            createdAt: "2026-07-13T00:00:00.000Z",
            updatedAt: "2026-07-13T00:00:00.000Z",
            blueprint: {
              title: "Midnight Velvet",
              concept: "A cinematic late-night jazz album.",
              targetLengthMinutes: 24,
              coverPrompt: "Elegant midnight jazz album cover.",
              videoPrompt: "Slow velvet curtains and stage light.",
              tracks: [
                {
                  title: "Amber Masque",
                  durationSeconds: 180,
                  prompt: "Slow saxophone-led noir jazz with brushed drums.",
                  mood: "noir"
                }
              ],
              youtube: {
                title: "Midnight Velvet - AI Jazz Album",
                description: "A cinematic AI jazz album.",
                tags: ["jazz", "ai music"]
              }
            },
            generatedTracks: [{ title: "Amber Masque", filePath: ".velvet/exports/amber-masque.mp3", durationSeconds: 180 }],
            render: {
              status: "rendered",
              message: "Rendered and ready to publish.",
              manifestPath: ".velvet/exports/playwright-blueprint/render-manifest.json",
              videoPath: ".velvet/exports/playwright-blueprint/midnight-velvet.mp4"
            }
          }
        ],
        prompts: [],
        jobs: [],
        uploads: []
      },
      null,
      2
    )}\n`
  );
}

test.describe("Velvet dashboard", () => {
  test("renders the first-launch studio shell", async ({ page }, testInfo) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("link", { name: "velvet AI music foundry" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create your first AI music release." })).toBeVisible();
    await expect(page.getByText("Connect ChatGPT, ElevenLabs, and YouTube before creating the first release.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Start Setup" }).first()).toHaveAttribute("href", "/settings");
    await expect(page.getByRole("link", { name: "Setup Required" })).toHaveAttribute("href", "/settings");
    await expect(page.getByRole("button", { name: /Play|Pause/ })).toHaveCount(0);

    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach(`dashboard-${testInfo.project.name}.png`, {
      body: screenshot,
      contentType: "image/png"
    });
  });

  test("renders the guided new-project flow", async ({ page }) => {
    await page.goto("/projects/new");

    await expect(page.getByRole("heading", { name: "Describe the song or album." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Song" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Album" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Blueprint" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Prompt Producer" })).toBeVisible();
    await expect(page.getByText("ChatGPT and ElevenLabs calls stay blocked until approved.")).toBeVisible();
    await expect(page.getByRole("link", { name: "New Media" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Projects" })).not.toHaveAttribute("aria-current", "page");

    await page.getByRole("button", { name: "Display options" }).click();
    const displayMenu = page.getByRole("menu", { name: "Display density" });
    await expect(displayMenu).toBeVisible();
    await displayMenu.getByRole("menuitemradio", { name: "Compact" }).click();
    await expect(page.locator("main")).toHaveClass(/compact-density/);
  });

  test("builds an editable brief with Prompt Producer", async ({ page }) => {
    await page.route("**/api/prompts/compose", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ prompt: "A warm analog jazz song led by piano and saxophone, with a gradual cinematic build and no vocals.", source: "ai" })
      });
    });
    await page.goto("/projects/new");
    await page.getByRole("button", { name: "Prompt Producer" }).click();
    await expect(page.getByRole("complementary", { name: "Prompt Producer" })).toBeVisible();
    await expect(page.getByText("01 / 06", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Jazz" }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Intimate" }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Piano" }).click();
    await page.getByRole("button", { name: "Saxophone" }).click();

    while (await page.getByRole("button", { name: /^(Next|Skip)$/ }).isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /^(Next|Skip)$/ }).click();
    }
    await page.getByRole("button", { name: "Create Prompt" }).click();
    await expect(page.getByLabel("Media brief")).toHaveValue(/warm analog jazz song/);
    await expect(page.getByText("Prompt Producer created this brief with ChatGPT.")).toBeVisible();
  });

  test("shows focused onboarding for ChatGPT, ElevenLabs and YouTube", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: "Onboarding" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "ChatGPT / OpenAI" })).toBeVisible();
    await page.getByRole("button", { name: "ElevenLabs" }).click();
    await expect(page.getByRole("heading", { name: "ElevenLabs" })).toBeVisible();
    await page.getByRole("button", { name: "02 YouTube" }).click();
    await expect(page.getByRole("heading", { name: "YouTube" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Login to YouTube" })).toHaveAttribute("href", "/api/youtube/login");
    await page.getByRole("button", { name: "03 Advanced" }).click();
    await page.getByText("Storage and worker settings").click();
    await expect(page.getByLabel("Supabase URL")).toBeVisible();
    await expect(page.getByLabel("Publishable key")).toBeVisible();
    await expect(page.getByLabel("Storage service key")).toBeVisible();
    await expect(page.getByLabel("Database URL")).toBeVisible();
    await expect(page.getByRole("button", { name: "Test Database" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Test Storage" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Initialize & Sync" })).toBeVisible();
    await expect(page.getByLabel("Max tracks/run")).toBeVisible();
    await expect(page.getByLabel("Max render attempts")).toBeVisible();
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
    await expect(visibleStepCards).toHaveCount(3);
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

  test("schedules rendered media with a readable studio control", async ({ page }) => {
    await writeFixtureDatabase();
    await page.goto("/publishing");

    await expect(page.getByRole("heading", { name: "Upload scheduler" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Rendered release" })).toContainText("Midnight Velvet");
    await expect(page.getByLabel("Publish time")).toBeVisible();
    await expect(page.getByRole("button", { name: "Schedule upload" })).toBeEnabled();
    await expect(page.getByRole("link", { name: "Scheduler" })).toHaveAttribute("aria-current", "page");
  });

  test("reports prior YouTube upload outcomes", async ({ page }) => {
    await page.route("**/api/analytics/uploads", (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        summary: { successfulUploads: 4, failedUploads: 1, scheduledUploads: 2, successRate: 80, publicUploads: 1, unlistedUploads: 2, privateUploads: 1 },
        months: [
          { key: "2026-02", label: "Feb", success: 0, failed: 0 },
          { key: "2026-03", label: "Mar", success: 0, failed: 0 },
          { key: "2026-04", label: "Apr", success: 0, failed: 0 },
          { key: "2026-05", label: "May", success: 1, failed: 0 },
          { key: "2026-06", label: "Jun", success: 1, failed: 1 },
          { key: "2026-07", label: "Jul", success: 2, failed: 0 }
        ],
        uploads: [{ id: "upload-1", projectId: fixtureProjectId, projectTitle: "Midnight Velvet", url: "https://youtube.com/watch?v=velvet", privacy: "unlisted", status: "uploaded", createdAt: "2026-07-13T00:00:00.000Z" }],
        failures: [{ id: "failed-1", projectId: fixtureProjectId, message: "YouTube quota unavailable.", createdAt: "2026-06-13T00:00:00.000Z" }]
      })
    }));
    await page.goto("/analytics");

    await expect(page.getByRole("heading", { name: "Upload analytics" })).toBeVisible();
    await expect(page.getByText("80%")).toBeVisible();
    await expect(page.getByRole("link", { name: "Midnight Velvet" })).toBeVisible();
    await expect(page.getByText("YouTube quota unavailable.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Analytics" })).toHaveAttribute("aria-current", "page");
  });

  test("shows a project-shaped loader instead of flashing the empty library", async ({ page }) => {
    await page.route("**/api/projects", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ projects: [{ id: fixtureProjectId, title: "Midnight Velvet", brief: "A late-night jazz release.", mediaType: "album", status: "blueprint", createdAt: "2026-07-13T00:00:00.000Z" }] })
      });
    });

    await page.goto("/projects");
    await expect(page.getByLabel("Loading projects")).toBeVisible();
    await expect(page.getByRole("heading", { name: "No projects yet" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Midnight Velvet" })).toBeVisible();
  });

  test("renders project review and workflow controls", async ({ page }) => {
    await writeFixtureDatabase();
    await page.goto(`/projects/${fixtureProjectId}`);

    await expect(page.getByRole("heading", { name: "Midnight Velvet" })).toBeVisible();
    await expect(page.getByText("Amber Masque")).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Render" })).toBeVisible();
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByLabel("YouTube title")).toBeVisible();
    const privacyMenu = page.getByRole("button", { name: "Privacy" });
    await expect(privacyMenu).toBeVisible();
    await privacyMenu.click();
    const privacyOptions = page.getByRole("listbox", { name: "Upload privacy options" });
    await expect(privacyOptions).toBeVisible();
    await privacyOptions.getByRole("option", { name: /Unlisted/ }).click();
    await expect(privacyMenu).toContainText("Unlisted");
    await page.getByRole("button", { name: "Usage" }).click();
    await expect(page.getByText("No usage recorded yet.")).toBeVisible();
  });

  test("opens commands and promotes generated audio into the studio transport", async ({ page }) => {
    await writeFixtureDatabase();
    await page.goto(`/projects/${fixtureProjectId}`);

    await page.getByRole("button", { name: "Open command palette" }).click();
    const commands = page.getByRole("dialog", { name: "Velvet commands" });
    await expect(commands).toBeVisible();
    await expect(commands.getByRole("textbox", { name: "Search commands" })).toHaveCSS("box-shadow", "none");
    await expect(commands.getByRole("link", { name: /New Media/ })).toBeVisible();
    await page.getByRole("button", { name: "Close command palette" }).click();

    await page.getByRole("button", { name: "Play Amber Masque" }).click();
    await expect(page.getByText("Amber Masque").last()).toBeVisible();
    await expect(page.getByRole("slider", { name: "Track position" })).toBeVisible();
  });

  test("opens audition, timeline, generation, and creative studio tools", async ({ page }) => {
    await writeFixtureDatabase();
    await page.goto(`/projects/${fixtureProjectId}`);

    await page.getByRole("button", { name: /^Amber Masque/ }).click();
    await expect(page.getByRole("dialog", { name: "Track audition" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Refine" })).toBeVisible();
    await page.getByRole("button", { name: "Close Track audition" }).click();

    await page.getByRole("button", { name: "Open album timeline" }).click();
    await expect(page.getByRole("dialog", { name: "Album timeline" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save timeline" })).toBeVisible();
    await page.getByRole("button", { name: "Close Album timeline" }).click();

    await page.getByRole("button", { name: "Open generation center" }).click();
    await expect(page.getByRole("dialog", { name: "Generation center" })).toBeVisible();
    await expect(page.getByText("Next generation estimate")).toBeVisible();
    await page.getByRole("button", { name: "Close Generation center" }).click();

    await page.getByRole("button", { name: "Title and thumbnail variants" }).click();
    const creativeVariants = page.getByRole("dialog", { name: "Creative variants" });
    await expect(creativeVariants).toBeVisible();
    await expect(creativeVariants.getByRole("button", { name: "Generate", exact: true })).toBeVisible();
  });

  test("keeps primary pages inside the fixed studio frame", async ({ page }) => {
    await writeFixtureDatabase();
    for (const path of ["/dashboard", "/projects/new", "/projects", `/projects/${fixtureProjectId}`, "/publishing", "/analytics", "/history", "/settings"]) {
      await page.goto(path);
      const hasScroll = await page.evaluate(() => {
        const root = document.scrollingElement ?? document.documentElement;
        return root.scrollHeight > root.clientHeight + 1 || root.scrollWidth > root.clientWidth + 1;
      });

      expect(hasScroll, `${path} should not create page scroll`).toBe(false);
    }
  });
});
