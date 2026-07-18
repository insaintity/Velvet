export const VELVET_SESSION_COOKIE = "velvet_session";
const SESSION_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
export const DEFAULT_ADMIN_USERNAME = "VelvetDEV";
export const DEFAULT_ADMIN_EMAIL = "emberflameog@gmail.com";
export const DEFAULT_STUDIO_PASSWORD = "Velvet9292";

export function authIsConfigured() {
  return true;
}

export function authIsRequired() {
  if (process.env.VELVET_DESKTOP === "1") return false;
  return process.env.NODE_ENV === "production" || Boolean(process.env.VELVET_ADMIN_USERNAME || process.env.VELVET_ADMIN_PASSWORD);
}

export async function passwordMatches(candidate: string) {
  const expected = process.env.VELVET_ADMIN_PASSWORD || DEFAULT_STUDIO_PASSWORD;
  return constantTimeEqual(await digest(candidate), await digest(expected));
}

export async function usernameMatches(candidate: string) {
  const expected = process.env.VELVET_ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME;
  return constantTimeEqual(await digest(candidate.trim().toLowerCase()), await digest(expected.trim().toLowerCase()));
}

export async function emailMatches(candidate: string) {
  const expected = process.env.VELVET_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
  return constantTimeEqual(await digest(candidate.trim().toLowerCase()), await digest(expected.trim().toLowerCase()));
}

export async function velvetAccountMatches(username: string, email: string, password: string) {
  const [validUsername, validEmail, validPassword] = await Promise.all([usernameMatches(username), emailMatches(email), passwordMatches(password)]);
  return validUsername && validEmail && validPassword;
}

export async function velvetLoginMatches(username: string, email: string | undefined, password: string) {
  const [validUsername, validEmail, validPassword] = await Promise.all([usernameMatches(username), email ? emailMatches(email) : Promise.resolve(true), passwordMatches(password)]);
  return validUsername && validEmail && validPassword;
}

export async function builtInDevAccountMatches(username: string, email: string, password: string) {
  const [validUsername, validEmail, validPassword] = await Promise.all([
    constantTimeEqual(await digest(username.trim().toLowerCase()), await digest(DEFAULT_ADMIN_USERNAME.toLowerCase())),
    constantTimeEqual(await digest(email.trim().toLowerCase()), await digest(DEFAULT_ADMIN_EMAIL.toLowerCase())),
    constantTimeEqual(await digest(password), await digest(DEFAULT_STUDIO_PASSWORD))
  ]);
  return validUsername && validEmail && validPassword;
}

export async function builtInDevLoginMatches(username: string, email: string | undefined, password: string) {
  const [validUsername, validEmail, validPassword] = await Promise.all([
    constantTimeEqual(await digest(username.trim().toLowerCase()), await digest(DEFAULT_ADMIN_USERNAME.toLowerCase())),
    email ? constantTimeEqual(await digest(email.trim().toLowerCase()), await digest(DEFAULT_ADMIN_EMAIL.toLowerCase())) : Promise.resolve(true),
    constantTimeEqual(await digest(password), await digest(DEFAULT_STUDIO_PASSWORD))
  ]);
  return validUsername && validEmail && validPassword;
}

export async function createSessionToken(now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + SESSION_LIFETIME_SECONDS;
  return `${expiresAt}.${await sign(String(expiresAt))}`;
}

export async function verifySessionToken(token: string | undefined, now = Date.now()) {
  if (!token || !authIsConfigured()) return false;
  const [expiresAt, signature, extra] = token.split(".");
  if (!expiresAt || !signature || extra || !/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= Math.floor(now / 1000)) return false;
  return constantTimeEqual(signature, await sign(expiresAt));
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_LIFETIME_SECONDS
};

async function sign(value: string) {
  const secret = process.env.VELVET_SESSION_SECRET || process.env.VELVET_ADMIN_PASSWORD || DEFAULT_STUDIO_PASSWORD;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function digest(value: string) {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function toHex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return difference === 0;
}
