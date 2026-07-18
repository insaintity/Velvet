import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_USERNAME, DEFAULT_STUDIO_PASSWORD } from "@/lib/auth";
import { readDatabase, updateSetup } from "./db";
import type { SetupRecord } from "./types";

const passwordIterations = 210_000;
const passwordKeyLength = 32;
const passwordDigest = "sha256";

export function validateAccountInput(username: unknown, email: unknown, password: unknown) {
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanPassword = typeof password === "string" ? password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { error: "Enter a valid email address." };
  if (cleanPassword.length < 8) return { error: "Choose a password with at least 8 characters." };
  const cleanUsername = typeof username === "string" && username.trim() ? username.trim() : cleanEmail.split("@")[0] ?? "velvet";
  return { username: cleanUsername.slice(0, 80), email: cleanEmail.slice(0, 180), password: cleanPassword };
}

export async function hasStoredOwnerAccount() {
  const database = await readDatabase();
  return Boolean(database.setup.auth?.passwordHash);
}

export async function createStoredOwnerAccount(username: string, email: string, password: string) {
  const database = await readDatabase();
  if (database.setup.auth?.passwordHash) throw new Error("A Velvet owner account already exists.");
  const now = new Date().toISOString();
  const account = {
    username,
    email,
    ...hashPassword(password),
    createdAt: now,
    updatedAt: now
  };
  await updateSetup({ auth: account });
  return account;
}

export async function storedOwnerAccountMatches(username: string, email: string, password: string) {
  const database = await readDatabase();
  return verifyStoredOwnerAccount(database.setup.auth, username, email, password);
}

export async function storedOwnerLoginMatches(username: string, email: string | undefined, password: string) {
  const database = await readDatabase();
  return verifyStoredOwnerAccount(database.setup.auth, username, email, password, { emailRequired: Boolean(email) });
}

export async function storedOwnerEmailLoginMatches(email: string, password: string) {
  const database = await readDatabase();
  return verifyStoredOwnerEmailAccount(database.setup.auth, email, password);
}

export async function readOwnerAccountSummary() {
  const database = await readDatabase();
  const account = database.setup.auth;
  return {
    username: account?.username || process.env.VELVET_ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME,
    email: account?.email || process.env.VELVET_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL,
    stored: Boolean(account?.passwordHash),
    recoveryEnabled: Boolean(process.env.VELVET_RECOVERY_CODE)
  };
}

export async function updateStoredOwnerAccount({ currentPassword, username, email, password }: { currentPassword: string; username?: string; email?: string; password?: string }) {
  const database = await readDatabase();
  const existing = database.setup.auth;
  const currentUsername = existing?.username || process.env.VELVET_ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME;
  const currentEmail = existing?.email || process.env.VELVET_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
  const validPassword = existing
    ? verifyStoredOwnerAccount(existing, currentUsername, currentEmail, currentPassword)
    : currentPassword === (process.env.VELVET_ADMIN_PASSWORD || DEFAULT_STUDIO_PASSWORD);
  if (!validPassword) throw new Error("Current password is not correct.");
  const nextUsername = typeof username === "string" && username.trim() ? username.trim().slice(0, 80) : currentUsername;
  const nextEmail = typeof email === "string" && email.trim() ? email.trim().toLowerCase().slice(0, 180) : currentEmail;
  if (nextUsername.length < 3) throw new Error("Choose a username with at least 3 characters.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) throw new Error("Enter a valid email address.");
  if (password && password.length < 8) throw new Error("Choose a password with at least 8 characters.");
  const now = new Date().toISOString();
  const account = {
    username: nextUsername,
    email: nextEmail,
    ...(password ? hashPassword(password) : existing ? { passwordHash: existing.passwordHash, passwordSalt: existing.passwordSalt } : hashPassword(currentPassword)),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  await updateSetup({ auth: account });
  return account;
}

export async function recoverStoredOwnerAccount({ email, recoveryCode, password }: { email: string; recoveryCode: string; password: string }) {
  const expectedCode = process.env.VELVET_RECOVERY_CODE;
  if (!expectedCode) throw new Error("Account recovery is not configured yet.");
  if (recoveryCode !== expectedCode) throw new Error("Recovery code is not correct.");
  const database = await readDatabase();
  const existing = database.setup.auth;
  const accountEmail = existing?.email || process.env.VELVET_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
  if (accountEmail.trim().toLowerCase() !== email.trim().toLowerCase()) throw new Error("Recovery details do not match this studio.");
  if (password.length < 8) throw new Error("Choose a password with at least 8 characters.");
  const now = new Date().toISOString();
  const account = {
    username: existing?.username || process.env.VELVET_ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME,
    email: accountEmail,
    ...hashPassword(password),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  await updateSetup({ auth: account });
  return account;
}

function verifyStoredOwnerAccount(account: SetupRecord["auth"], username: string, email: string | undefined, password: string, options: { emailRequired?: boolean } = { emailRequired: true }) {
  if (!account?.passwordHash || !account.passwordSalt) return false;
  const usernameMatches = account.username.trim().toLowerCase() === username.trim().toLowerCase();
  const emailMatches = !options.emailRequired || account.email.trim().toLowerCase() === email?.trim().toLowerCase();
  if (!usernameMatches || !emailMatches) return false;
  const candidate = derivePasswordHash(password, account.passwordSalt);
  const expected = Buffer.from(account.passwordHash, "hex");
  return candidate.byteLength === expected.byteLength && timingSafeEqual(candidate, expected);
}

function verifyStoredOwnerEmailAccount(account: SetupRecord["auth"], email: string, password: string) {
  if (!account?.passwordHash || !account.passwordSalt) return false;
  if (account.email.trim().toLowerCase() !== email.trim().toLowerCase()) return false;
  const candidate = derivePasswordHash(password, account.passwordSalt);
  const expected = Buffer.from(account.passwordHash, "hex");
  return candidate.byteLength === expected.byteLength && timingSafeEqual(candidate, expected);
}

function hashPassword(password: string) {
  const passwordSalt = randomBytes(16).toString("hex");
  return { passwordSalt, passwordHash: derivePasswordHash(password, passwordSalt).toString("hex") };
}

function derivePasswordHash(password: string, salt: string) {
  return pbkdf2Sync(password, salt, passwordIterations, passwordKeyLength, passwordDigest);
}
