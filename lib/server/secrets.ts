import { readFile, writeFile } from "node:fs/promises";
import { decryptSecret, encryptSecret, type EncryptedValue } from "./crypto";
import { ensureVelvetDir, secretsPath } from "./paths";
import type { ProviderName } from "./types";

type SecretName =
  | ProviderName
  | "googleClientId"
  | "googleClientSecret"
  | "youtubeOAuthState"
  | "youtubeRefreshToken"
  | "databaseUrl"
  | "workerSecret"
  | "supabaseServiceRole";

type SecretStore = Partial<Record<SecretName, EncryptedValue>>;

const envSecretNames: Record<SecretName, string[]> = {
  openai: ["OPENAI_API_KEY"],
  elevenlabs: ["ELEVENLABS_API_KEY"],
  youtube: [],
  googleClientId: ["GOOGLE_CLIENT_ID"],
  googleClientSecret: ["GOOGLE_CLIENT_SECRET"],
  youtubeOAuthState: [],
  youtubeRefreshToken: ["YOUTUBE_REFRESH_TOKEN"],
  databaseUrl: ["DATABASE_URL"],
  workerSecret: ["WORKER_SECRET"],
  supabaseServiceRole: ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]
};

async function readSecretStore(): Promise<SecretStore> {
  await ensureVelvetDir();

  try {
    return JSON.parse(await readFile(secretsPath, "utf8"));
  } catch {
    return {};
  }
}

async function writeSecretStore(store: SecretStore) {
  await ensureVelvetDir();
  await writeFile(secretsPath, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
}

export async function saveSecret(name: SecretName, value: string) {
  if (!value.trim()) {
    return;
  }

  if (process.env.VELVET_SECRET_PROVIDER === "env") {
    return;
  }

  if (process.env.VELVET_SECRET_PROVIDER === "vault") {
    await saveVaultSecret(name, value.trim());
    return;
  }

  const store = await readSecretStore();
  store[name] = await encryptSecret(value.trim());
  await writeSecretStore(store);
}

export async function deleteSecret(name: SecretName) {
  if (process.env.VELVET_SECRET_PROVIDER === "env" || process.env.VELVET_SECRET_PROVIDER === "vault") {
    return;
  }

  const store = await readSecretStore();
  delete store[name];
  await writeSecretStore(store);
}

export async function readSecret(name: SecretName) {
  if (process.env.VELVET_SECRET_PROVIDER === "vault") {
    return readVaultSecret(name);
  }

  const envSecret = readEnvironmentSecret(name);
  if (envSecret) {
    return envSecret;
  }

  const store = await readSecretStore();
  const encrypted = store[name];
  return encrypted ? decryptSecret(encrypted) : undefined;
}

export async function hasSecret(name: SecretName) {
  if (process.env.VELVET_SECRET_PROVIDER === "vault") {
    return Boolean(await readVaultSecret(name));
  }

  if (readEnvironmentSecret(name)) {
    return true;
  }

  const store = await readSecretStore();
  return Boolean(store[name]);
}

function readEnvironmentSecret(name: SecretName) {
  for (const envName of envSecretNames[name]) {
    const value = process.env[envName];
    if (value?.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

async function readVaultSecret(name: SecretName) {
  const config = getVaultConfig();
  if (!config) {
    return undefined;
  }

  const response = await fetch(`${config.addr}/v1/${config.mount}/data/${config.path}/${name}`, {
    headers: { "X-Vault-Token": config.token }
  });

  if (!response.ok) {
    return undefined;
  }

  const body = (await response.json()) as { data?: { data?: { value?: string } } };
  return body.data?.data?.value?.trim() || undefined;
}

async function saveVaultSecret(name: SecretName, value: string) {
  const config = getVaultConfig();
  if (!config) {
    return;
  }

  await fetch(`${config.addr}/v1/${config.mount}/data/${config.path}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Vault-Token": config.token
    },
    body: JSON.stringify({ data: { value } })
  });
}

function getVaultConfig() {
  const addr = process.env.VELVET_VAULT_ADDR?.replace(/\/$/, "");
  const token = process.env.VELVET_VAULT_TOKEN;

  if (!addr || !token) {
    return undefined;
  }

  return {
    addr,
    token,
    mount: process.env.VELVET_VAULT_MOUNT || "secret",
    path: process.env.VELVET_VAULT_PATH || "velvet"
  };
}
