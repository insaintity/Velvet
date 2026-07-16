import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authIsRequired, createSessionToken, passwordMatches, verifySessionToken } from "./auth";

const originalNodeEnv = process.env.NODE_ENV;
const mutableEnv = process.env as Record<string, string | undefined>;

describe("private studio authentication", () => {
  beforeEach(() => {
    process.env.VELVET_ADMIN_PASSWORD = "velvet-test-password";
    process.env.VELVET_SESSION_SECRET = "velvet-test-session-secret";
  });

  afterEach(() => {
    delete process.env.VELVET_ADMIN_PASSWORD;
    delete process.env.VELVET_SESSION_SECRET;
    delete process.env.VELVET_DESKTOP;
    mutableEnv.NODE_ENV = originalNodeEnv;
  });

  it("accepts only the configured password", async () => {
    await expect(passwordMatches("velvet-test-password")).resolves.toBe(true);
    await expect(passwordMatches("not-the-password")).resolves.toBe(false);
  });

  it("uses Enter as the default studio password", async () => {
    delete process.env.VELVET_ADMIN_PASSWORD;
    await expect(passwordMatches("Enter")).resolves.toBe(true);
    await expect(passwordMatches("enter")).resolves.toBe(false);
  });

  it("verifies active sessions and rejects tampering or expiry", async () => {
    const issuedAt = Date.parse("2026-07-14T00:00:00.000Z");
    const token = await createSessionToken(issuedAt);
    await expect(verifySessionToken(token, issuedAt + 60_000)).resolves.toBe(true);
    await expect(verifySessionToken(`${token}tampered`, issuedAt + 60_000)).resolves.toBe(false);
    await expect(verifySessionToken(token, issuedAt + 8 * 24 * 60 * 60_000)).resolves.toBe(false);
  });

  it("does not require web login inside the private desktop app", () => {
    mutableEnv.NODE_ENV = "production";
    process.env.VELVET_DESKTOP = "1";
    expect(authIsRequired()).toBe(false);
  });
});
