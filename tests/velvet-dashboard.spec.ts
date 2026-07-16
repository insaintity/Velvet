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

async function writeEmptyDatabase() {
  const velvetDirectory = path.join(process.cwd(), ".velvet");
  const databaseFile = path.join(velvetDirectory, "db.json");
  await mkdir(velvetDirectory, { recursive: true });
  await writeFile(databaseFile, `${JSON.stringify({ setup: {}, projects: [], prompts: [], jobs: [], uploads: [] }, null, 2)}\n`);
}

test.describe("Velvet dashboard", () => {
  test("centers the Velvet account login and accepts the default account", async ({ page }) => {
    await page.goto("/login");
    const loginCard = page.getByRole("region", { name: "Velvet account login" });
    await expect(loginCard).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByLabel("Confirm password")).toBeVisible();
    await loginCard.getByRole("button", { name: "Log in" }).first().click();
    await page.getByRole("button", { name: "Lost access? Recover account" }).click();
    await expect(page.getByLabel("Recovery code")).toBeVisible();
    await page.getByRole("button", { name: "Back to login" }).click();
    await expect(page.getByPlaceholder("Username")).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();

    const cardBox = await loginCard.boundingBox();
    const viewport = page.viewportSize()!;
    expect(cardBox).not.toBeNull();
    expect(Math.abs((cardBox!.x + cardBox!.width / 2) - viewport.width / 2)).toBeLessThanOrEqual(8);
    expect(Math.abs((cardBox!.y + cardBox!.height / 2) - viewport.height / 2)).toBeLessThanOrEqual(8);

    await page.getByLabel("Username").fill("velvet");
    await page.getByLabel("Verified email").fill("studio@velvet.local");
    await page.getByLabel("Password").fill("Enter");
    await loginCard.locator("form").getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/projects\/new$/);
  });

  test("opens new media as the first studio page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/projects\/new$/);
    await expect(page.getByRole("heading", { name: "Describe the song or album." })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Set up your Velvet studio." })).toBeVisible();
  });

  test("renders the first-launch studio shell", async ({ page }, testInfo) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/projects\/new$/);
    await expect(page.getByRole("link", { name: "velvet AI music foundry" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Set up your Velvet studio." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Describe the song or album." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Connect OpenAI" }).first()).toHaveAttribute("href", "/settings");
    await expect(page.getByRole("button", { name: /Play|Pause/ })).toHaveCount(0);

    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach(`dashboard-${testInfo.project.name}.png`, {
      body: screenshot,
      contentType: "image/png"
    });
  });

  test("keeps desktop-only chrome out of the hosted studio", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("velvet-onboarding", "dismissed"));
    await page.goto("/projects/new");
    const edges = page.locator(".window-drag-edge");
    await expect(edges).toHaveCount(4);
    await expect(edges.first()).toHaveCSS("pointer-events", "none");

    const regions = await page.evaluate(() => {
      return [...document.querySelectorAll<HTMLElement>(".window-drag-edge")].map((edge) => {
        const rect = edge.getBoundingClientRect();
        const style = getComputedStyle(edge);
        return { width: rect.width, height: rect.height, drag: style.getPropertyValue("-webkit-app-region"), pointerEvents: style.pointerEvents };
      });
    });
    const viewport = page.viewportSize()!;

    expect(regions).toEqual([
      { width: viewport.width, height: 10, drag: "none", pointerEvents: "none" },
      { width: 10, height: viewport.height - 20, drag: "none", pointerEvents: "none" },
      { width: viewport.width, height: 10, drag: "none", pointerEvents: "none" },
      { width: 10, height: viewport.height - 20, drag: "none", pointerEvents: "none" }
    ]);

    await expect(page.getByRole("group", { name: "Window controls" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Display options" })).toHaveCount(0);
  });

  test("renders the guided new-project flow", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("velvet-onboarding", "dismissed"));
    await page.goto("/projects/new");

    await expect(page.getByRole("heading", { name: "Describe the song or album." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Song" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Album" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Blueprint" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Prompt Producer" })).toBeVisible();
    await expect(page.getByText("publishing is always a separate optional action.")).toBeVisible();
    await expect(page.getByRole("link", { name: "New Media" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Projects" })).not.toHaveAttribute("aria-current", "page");

    await expect(page.locator("html")).toHaveClass(/web-mode/);
    await expect(page.getByRole("button", { name: "Display options" })).toHaveCount(0);
    await expect(page.getByText("Hosted studio")).toBeVisible();
  });

  test("keeps the studio readable in a compact window", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 520 });
    await page.addInitScript(() => window.localStorage.setItem("velvet-onboarding", "dismissed"));
    await page.goto("/projects/new");

    const heading = page.getByRole("heading", { name: "Describe the song or album." });
    await expect(heading).toBeVisible();
    const headingBox = await heading.boundingBox();
    expect(headingBox?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect(headingBox?.y ?? -1).toBeGreaterThanOrEqual(0);
    await expect(page.getByRole("button", { name: "Create Blueprint" })).toBeVisible();

    const hasPageScroll = await page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      return root.scrollHeight > root.clientHeight + 1 || root.scrollWidth > root.clientWidth + 1;
    });
    expect(hasPageScroll).toBe(false);
  });

  test("advances onboarding after both provider keys validate", async ({ page }) => {
    let setupReady = false;
    await page.route("**/api/setup", async (route) => {
      if (route.request().method() === "POST") {
        setupReady = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            setup: {
              openai: { status: { state: "valid", message: "Key is valid." } },
              elevenlabs: { status: { state: "valid", message: "Key is valid." } }
            },
            secrets: { openai: true, elevenlabs: true, youtube: false, database: false, storage: false },
            secretHints: { openai: "sk-****1234", elevenlabs: "****5678" },
            validation: { openai: { state: "valid", message: "Key is valid." }, elevenlabs: { state: "valid", message: "Key is valid." } }
          })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          setup: setupReady ? {
            openai: { status: { state: "valid" } },
            elevenlabs: { status: { state: "valid" } }
          } : {},
          secrets: { openai: setupReady, elevenlabs: setupReady, youtube: false },
          secretHints: {}
        })
      });
    });
    await page.goto("/settings");
    await page.getByLabel("OpenAI API key").fill("sk-test-openai");
    await page.getByRole("button", { name: "ElevenLabs", exact: true }).click();
    await page.getByLabel("ElevenLabs API key").fill("test-elevenlabs");
    await page.getByRole("button", { name: "Save Setup" }).click();

    await expect(page.getByText("ChatGPT and ElevenLabs are connected. YouTube is optional for publishing later.")).toBeVisible();
    await expect(page.locator(".setup-progress-count")).toHaveText(/2\s*\/\s*2/);
    await expect(page.getByRole("heading", { name: "Database & media" })).toBeVisible();
    await expect(page.getByLabel("AI + Music complete")).toBeVisible();
  });

  test("runs first-time setup once and keeps saved keys available in Settings", async ({ page }) => {
    const saved = { openai: false, elevenlabs: false };
    const valid = { openai: false, elevenlabs: false };

    await page.route("**/api/setup", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON() as { openaiApiKey?: string; elevenLabsApiKey?: string };
        if (body.openaiApiKey) saved.openai = valid.openai = true;
        if (body.elevenLabsApiKey) saved.elevenlabs = valid.elevenlabs = true;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          setup: {
            openai: { status: { state: valid.openai ? "valid" : saved.openai ? "unchecked" : "missing" } },
            elevenlabs: { status: { state: valid.elevenlabs ? "valid" : saved.elevenlabs ? "unchecked" : "missing" } },
            youtube: { status: { state: "missing" } }
          },
          secrets: { openai: saved.openai, elevenlabs: saved.elevenlabs, youtube: false, youtubeOAuth: false },
          secretHints: {
            openai: saved.openai ? "sk-****1234" : undefined,
            elevenlabs: saved.elevenlabs ? "****5678" : undefined
          },
          validation: {
            ...(valid.openai ? { openai: { state: "valid", message: "Key is valid." } } : {}),
            ...(valid.elevenlabs ? { elevenlabs: { state: "valid", message: "Key is valid." } } : {})
          }
        })
      });
    });
    await page.route("**/api/setup/youtube-oauth", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ configured: true }) }));
    await page.goto("/projects/new");
    const dialog = page.getByRole("dialog", { name: "Set up your Velvet studio." });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("OpenAI API key").fill("sk-test-openai");
    await dialog.getByRole("button", { name: "Save & Continue" }).click();
    await expect(dialog.getByText("Connect ElevenLabs")).toBeVisible();

    await dialog.getByLabel("ElevenLabs API key").fill("test-elevenlabs");
    await dialog.getByRole("button", { name: "Save & Continue" }).click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("dialog", { name: "Set up your Velvet studio." })).toHaveCount(0);

    await page.goto("/settings");
    await expect(page.getByText("Saved key: sk-****1234")).toBeVisible();
    await page.getByRole("button", { name: "ElevenLabs", exact: true }).click();
    await expect(page.getByText("Saved key: ****5678")).toBeVisible();
  });

  test("builds an editable brief with Prompt Producer", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("velvet-onboarding", "dismissed"));
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

    await expect(page.getByRole("heading", { name: "Velvet Account" })).toBeVisible();
    await expect(page.getByLabel("Current password")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "New password", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Onboarding" })).toBeVisible();
    await expect(page.locator(".setup-progress-count")).toHaveCSS("font-size", "28px");
    await expect(page.locator(".setup-progress-count span")).toHaveCSS("font-size", "28px");
    await expect(page.getByRole("heading", { name: "ChatGPT / OpenAI" })).toBeVisible();
    await page.getByTitle("How to get OpenAI API key").hover();
    await expect(page.getByRole("link", { name: "Open OpenAI API keys" })).toHaveAttribute("href", "https://platform.openai.com/api-keys");
    await expect(page.getByText("Create new secret key", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "ElevenLabs" }).click();
    await expect(page.getByRole("heading", { name: "ElevenLabs" })).toBeVisible();
    await page.getByTitle("How to get ElevenLabs API key").hover();
    await expect(page.getByRole("link", { name: "Open ElevenLabs API keys" })).toHaveAttribute("href", "https://elevenlabs.io/app/developers/api-keys");
    await expect(page.getByText("open Developers", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: /02 YouTube/ }).click();
    await expect(page.getByRole("heading", { name: /YouTube/ })).toBeVisible();
    await expect(page.getByText("Creating, rendering, and exporting still work without it.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Log in with YouTube" })).toBeEnabled();
    await expect(page.getByLabel("Google OAuth client ID")).toBeVisible();
    await expect(page.getByLabel("Google OAuth client secret")).toBeVisible();
    await page.getByRole("button", { name: "03 Advanced" }).click();
    await page.getByText("Database and media settings").click();
    await expect(page.getByLabel("Storage endpoint")).toBeVisible();
    await expect(page.getByLabel("Storage bucket")).toBeVisible();
    await expect(page.getByLabel("Storage access key")).toBeVisible();
    await expect(page.getByLabel("Storage secret key")).toBeVisible();
    await expect(page.getByLabel("Storage region")).toBeVisible();
    await expect(page.getByLabel("Database URL")).toBeVisible();
    await expect(page.getByRole("button", { name: "Test Database" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Test Storage" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Initialize & Sync" })).toBeVisible();
    await expect(page.getByLabel("Max tracks/run")).toBeVisible();
    await expect(page.getByLabel("Max render attempts")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Setup" })).toBeVisible();
  });

  test("returns to settings when YouTube OAuth is not configured", async ({ page }) => {
    await page.goto("/api/youtube/login");

    await expect(page).toHaveURL(/\/settings\?youtube=missing_config/);
    await page.getByRole("button", { name: /02 YouTube/ }).click();
    await expect(page.getByText("Google sign-in is not configured for this Velvet build.")).toBeVisible();
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
    await expect(page.getByRole("button", { name: "Connect YouTube to publish" })).toBeDisabled();
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
    await expect(page.getByRole("link", { name: "Download MP4" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Download archive" })).toBeVisible();
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
    await expect(commands.getByRole("link", { name: /Video Editor/ })).toBeVisible();
    await expect(commands.getByRole("link", { name: /Thumbnail Editor/ })).toBeVisible();
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

    await page.getByRole("link", { name: "Open video timeline" }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${fixtureProjectId}/timeline$`));
    await expect(page.getByRole("region", { name: "Video timeline" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save timeline" })).toBeVisible();
    await expect(page.getByText("VIDEO/IMAGE", { exact: true })).toBeVisible();
    await expect(page.getByText("EFFECT", { exact: true })).toBeVisible();
    await expect(page.getByText("AUDIO", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cut" })).toBeVisible();
    const transparency = page.getByRole("slider", { name: "Transparency" });
    await expect(transparency).toBeVisible();
    await expect(page.getByRole("button", { name: "velvet" })).toBeVisible();
    await transparency.fill("64");
    await page.getByRole("button", { name: "Save timeline" }).click();
    await expect(page.getByText("Video timeline saved.")).toBeVisible();
    const savedProject = await (await page.request.get(`/api/projects/${fixtureProjectId}`)).json();
    expect(savedProject.project.production.overlayOpacity).toBe(64);
    await page.getByRole("button", { name: "Back to project" }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${fixtureProjectId}$`));

    await page.getByRole("button", { name: "Open generation center" }).click();
    await expect(page.getByRole("dialog", { name: "Generation center" })).toBeVisible();
    await expect(page.getByText("Next generation estimate")).toBeVisible();
    await page.getByRole("button", { name: "Close Generation center" }).click();

    await page.getByRole("link", { name: "Open thumbnail editor" }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${fixtureProjectId}/thumbnail$`));
    await expect(page.getByRole("region", { name: "Thumbnail editor" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Thumbnail Editor" })).toHaveAttribute("aria-current", "page");
  });

  test("opens the video editor without a project", async ({ page }) => {
    await writeEmptyDatabase();
    await page.addInitScript(() => window.localStorage.setItem("velvet-onboarding", "dismissed"));
    await page.goto("/video-editor");

    await expect(page.getByRole("region", { name: "Video timeline" })).toBeVisible();
    await expect(page.getByText("Drop artwork or audio here")).toBeVisible();
    await expect(page.getByText("Drop audio here or push tracks from New Media")).toBeVisible();
    await expect(page.getByText("VIDEO/IMAGE", { exact: true })).toBeVisible();
    await expect(page.getByText("EFFECT", { exact: true })).toBeVisible();
    await expect(page.getByText("AUDIO", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Fit crop" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove audio" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save timeline" })).toBeVisible();
  });

  test("keeps primary pages inside the fixed studio frame", async ({ page }) => {
    await writeFixtureDatabase();
    await page.addInitScript(() => window.localStorage.setItem("velvet-onboarding", "dismissed"));
    for (const path of ["/projects/new", "/projects", `/projects/${fixtureProjectId}`, "/video-editor", "/thumbnail-editor", "/publishing", "/analytics", "/history", "/settings"]) {
      await page.goto(path);
      const hasScroll = await page.evaluate(() => {
        const root = document.scrollingElement ?? document.documentElement;
        return root.scrollHeight > root.clientHeight + 1 || root.scrollWidth > root.clientWidth + 1;
      });

      expect(hasScroll, `${path} should not create page scroll`).toBe(false);
    }
  });
});
