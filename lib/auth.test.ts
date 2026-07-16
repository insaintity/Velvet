import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authIsRequired, createSessionToken, emailMatches, passwordMatches, usernameMatches, velvetAccountMatches, verifySessionToken } from "./auth";

const originalNodeEnv = process.env.NODE_ENV;
const mutableEnv = process.env as Record<string, string | undefined>;

describe("private studio authentication", () => {
  beforeEach(() => {
    process.env.VELVET_ADMIN_USERNAME = "luna";
    process.env.VELVET_ADMIN_EMAIL = "luna@velvet.test";
    process.env.VELVET_ADMIN_PASSWORD = "velvet-test-password";
    process.env.VELVET_SESSION_SECRET = "velvet-test-session-secret";
  });

  afterEach(() => {
    delete process.env.VELVET_ADMIN_USERNAME;
    delete process.env.VELVET_ADMIN_EMAIL;
    delete process.env.VELVET_ADMIN_PASSWORD;
    delete process.env.VELVET_SESSION_SECRET;
    delete process.env.VELVET_DESKTOP;
    mutableEnv.NODE_ENV = originalNodeEnv;
  });

  it("accepts only the configured Velvet account", async () => {
    await expect(usernameMatches("luna")).resolves.toBe(true);
    await expect(usernameMatches("LUNA")).resolves.toBe(true);
    await expect(usernameMatches("noir")).resolves.toBe(false);
    await expect(emailMatches("luna@velvet.test")).resolves.toBe(true);
    await expect(emailMatches("LUNA@VELVET.TEST")).resolves.toBe(true);
    await expect(emailMatches("noir@velvet.test")).resolves.toBe(false);
    await expect(passwordMatches("velvet-test-password")).resolves.toBe(true);
    await expect(passwordMatches("not-the-password")).resolves.toBe(false);
    await expect(velvetAccountMatches("luna", "luna@velvet.test", "velvet-test-password")).resolves.toBe(true);
    await expect(velvetAccountMatches("noir", "luna@velvet.test", "velvet-test-password")).resolves.toBe(false);
    await expect(velvetAccountMatches("luna", "noir@velvet.test", "velvet-test-password")).resolves.toBe(false);
  });

  it("uses velvet and Enter as the default account", async () => {
    delete process.env.VELVET_ADMIN_USERNAME;
    delete process.env.VELVET_ADMIN_EMAIL;
    delete process.env.VELVET_ADMIN_PASSWORD;
    await expect(usernameMatches("velvet")).resolves.toBe(true);
    await expect(usernameMatches("Velvet")).resolves.toBe(true);
    await expect(emailMatches("studio@velvet.local")).resolves.toBe(true);
    await expect(emailMatches("not-an-email")).resolves.toBe(false);
    await expect(passwordMatches("Enter")).resolves.toBe(true);
    await expect(passwordMatches("enter")).resolves.toBe(false);
    await expect(velvetAccountMatches("velvet", "studio@velvet.local", "Enter")).resolves.toBe(true);
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
