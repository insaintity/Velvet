import { afterEach, describe, expect, it, vi } from "vitest";
import { hasSecret, readSecret, saveSecret } from "./secrets";

describe("secret provider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads production secrets from the environment when configured", async () => {
    vi.stubEnv("VELVET_SECRET_PROVIDER", "env");
    vi.stubEnv("OPENAI_API_KEY", "sk-env-openai");

    await expect(readSecret("openai")).resolves.toBe("sk-env-openai");
    await expect(hasSecret("openai")).resolves.toBe(true);
  });

  it("reads and writes secrets through a Vault-compatible provider", async () => {
    vi.stubEnv("VELVET_SECRET_PROVIDER", "vault");
    vi.stubEnv("VELVET_VAULT_ADDR", "https://vault.example.com/");
    vi.stubEnv("VELVET_VAULT_TOKEN", "vault-token");
    vi.stubEnv("VELVET_VAULT_MOUNT", "kv");
    vi.stubEnv("VELVET_VAULT_PATH", "velvet-app");

    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Response("{}", { status: 200 });
      }

      return Response.json({ data: { data: { value: "sk-vault-openai" } } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(readSecret("openai")).resolves.toBe("sk-vault-openai");
    await saveSecret("openai", "sk-new-openai");

    expect(fetchMock).toHaveBeenCalledWith("https://vault.example.com/v1/kv/data/velvet-app/openai", {
      headers: { "X-Vault-Token": "vault-token" }
    });
    expect(fetchMock).toHaveBeenCalledWith("https://vault.example.com/v1/kv/data/velvet-app/openai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Vault-Token": "vault-token"
      },
      body: JSON.stringify({ data: { value: "sk-new-openai" } })
    });
  });
});
