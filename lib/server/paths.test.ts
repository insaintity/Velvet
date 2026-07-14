import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  delete process.env.VELVET_DATA_DIR;
  vi.resetModules();
});

it("uses the desktop data directory when configured", async () => {
  const configured = path.join(process.cwd(), "desktop-data-test");
  process.env.VELVET_DATA_DIR = configured;
  vi.resetModules();

  const { velvetDir } = await import("./paths");
  expect(velvetDir).toBe(path.resolve(configured));
});
