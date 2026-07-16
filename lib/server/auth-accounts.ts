import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { readDatabase, updateSetup } from "./db";
import type { SetupRecord } from "./types";

const passwordIterations = 210_000;
const passwordKeyLength = 32;
const passwordDigest = "sha256";

export function validateAccountInput(username: unknown, email: unknown, password: unknown) {
  const cleanUsername = typeof username === "string" ? username.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanPassword = typeof password === "string" ? password : "";
  if (cleanUsername.length < 3) return { error: "Choose a username with at least 3 characters." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { error: "Enter a valid email address." };
  if (cleanPassword.length < 8) return { error: "Choose a password with at least 8 characters." };
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

function verifyStoredOwnerAccount(account: SetupRecord["auth"], username: string, email: string, password: string) {
  if (!account?.passwordHash || !account.passwordSalt) return false;
  const usernameMatches = account.username.trim().toLowerCase() === username.trim().toLowerCase();
  const emailMatches = account.email.trim().toLowerCase() === email.trim().toLowerCase();
  if (!usernameMatches || !emailMatches) return false;
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
