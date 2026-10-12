import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@napi-rs/keyring", () => ({
  Entry: class {
    constructor() {
      throw new Error("headless: no keyring");
    }
  },
}));

describe("headless CLI authentication", () => {
  let root: string;
  let file: string;
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("LIQUIDLM_API_TOKEN", "");
    vi.stubEnv("LIQUIDLM_TOKEN", "");
    root = mkdtempSync(join(tmpdir(), "liquidlm-auth-"));
    file = join(root, "credentials.json");
    vi.doMock("./config.js", () => ({
      CONFIG_DIR: root,
      CREDENTIALS_FILE: file,
      getApiUrl: () => "https://api.example/v1",
    }));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.doUnmock("./config.js");
    rmSync(root, { recursive: true, force: true });
  });
  it("persists a rotated fallback token and preserves it when switching orgs", async () => {
    writeFileSync(
      file,
      JSON.stringify({
        access_token: "old",
        refresh_token: "refresh-old",
        expires_at: 0,
        provider: "keycloak",
        client_id: "liquidlm-cli",
      }),
    );
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "new",
          refresh_token: "refresh-new",
          token_type: "Bearer",
          expires_in: 600,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetch);
    const auth = await import("./auth.js");
    expect(await Promise.all([auth.getToken(), auth.getToken()])).toEqual([
      "new",
      "new",
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(readFileSync(file, "utf8")).refresh_token).toBe(
      "refresh-new",
    );
    auth.setActiveOrg("org-two");
    expect(JSON.parse(readFileSync(file, "utf8")).refresh_token).toBe(
      "refresh-new",
    );
  });
  it("uses a PAT without saved credentials or a refresh attempt", async () => {
    vi.stubEnv("LIQUIDLM_API_TOKEN", "lqlm_test");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const auth = await import("./auth.js");
    expect(auth.isLoggedIn()).toBe(true);
    expect(await auth.getToken()).toBe("lqlm_test");
    expect(fetch).not.toHaveBeenCalled();
  });
});
