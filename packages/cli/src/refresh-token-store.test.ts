import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tempRoots: string[] = [];

vi.mock("@napi-rs/keyring", () => {
  const passwords = new Map<string, string>();
  let shouldFail = false;
  let entryCount = 0;

  class Entry {
    constructor(
      private service: string,
      private account: string,
    ) {
      entryCount++;
    }

    private key(): string {
      return `${this.service}:${this.account}`;
    }

    setPassword(password: string): void {
      if (shouldFail) throw new Error("keyring unavailable");
      passwords.set(this.key(), password);
    }

    getPassword(): string | null {
      if (shouldFail) throw new Error("keyring unavailable");
      return passwords.get(this.key()) ?? null;
    }

    deletePassword(): void {
      if (shouldFail) throw new Error("keyring unavailable");
      passwords.delete(this.key());
    }
  }

  return {
    Entry,
    __setKeyringUnavailable(unavailable: boolean) {
      shouldFail = unavailable;
    },
    __resetKeyring() {
      passwords.clear();
      shouldFail = false;
      entryCount = 0;
    },
    __getEntryCount: () => entryCount,
  };
});

async function loadStoreModule() {
  vi.resetModules();
  return import("./refresh-token-store.js");
}

async function loadKeyringMock() {
  return import("@napi-rs/keyring") as Promise<{
    __setKeyringUnavailable: (unavailable: boolean) => void;
    __resetKeyring: () => void;
    __getEntryCount: () => number;
  }>;
}

describe("refresh-token-store", () => {
  let credentialsFile = "";
  let configDir = "";

  beforeEach(async () => {
    vi.stubEnv("LIQUIDLM_CREDENTIAL_STORE", "");
    const root = mkdtempSync(join(tmpdir(), "liquidlm-refresh-store-"));
    tempRoots.push(root);
    configDir = join(root, ".liquidlm");
    credentialsFile = join(configDir, "credentials.json");

    vi.doMock("./config.js", () => ({
      CONFIG_DIR: configDir,
      CREDENTIALS_FILE: credentialsFile,
    }));

    const keyring = await loadKeyringMock();
    keyring.__resetKeyring();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    for (const root of tempRoots.splice(0)) {
      if (existsSync(root)) rmSync(root, { recursive: true, force: true });
    }
    vi.doUnmock("./config.js");
    vi.resetModules();
  });

  it("stores and reads the refresh token from the keyring when available", async () => {
    const store = await loadStoreModule();

    store.setRefreshToken("refresh-a");
    expect(store.getRefreshToken()).toBe("refresh-a");
    expect(store.getRefreshTokenBackend()).toBe("keyring");
    expect(existsSync(credentialsFile)).toBe(false);
  });

  it("falls back to the credentials file when the keyring is unavailable", async () => {
    const keyring = await loadKeyringMock();
    keyring.__setKeyringUnavailable(true);
    const store = await loadStoreModule();

    store.setRefreshToken("refresh-file");
    expect(store.getRefreshToken()).toBe("refresh-file");
    expect(store.getRefreshTokenBackend()).toBe("file");

    const parsed = JSON.parse(readFileSync(credentialsFile, "utf-8")) as {
      refresh_token: string;
    };
    expect(parsed.refresh_token).toBe("refresh-file");
  });

  it("uses private files without touching the keychain when explicitly selected", async () => {
    vi.stubEnv("LIQUIDLM_CREDENTIAL_STORE", "file");
    const keyring = await loadKeyringMock();
    const store = await loadStoreModule();

    mkdirSync(configDir, { recursive: true });
    writeFileSync(credentialsFile, JSON.stringify({ access_token: "access" }));
    store.setRefreshToken("refresh-file");
    expect(store.getRefreshToken()).toBe("refresh-file");
    expect(store.getRefreshTokenBackend()).toBe("file");
    expect(JSON.parse(readFileSync(credentialsFile, "utf-8"))).toEqual({
      access_token: "access",
      refresh_token: "refresh-file",
    });
    if (process.platform !== "win32") {
      expect(statSync(configDir).mode & 0o777).toBe(0o700);
      expect(statSync(credentialsFile).mode & 0o777).toBe(0o600);
    }

    // A later process reading the stored token must not migrate it to keychain.
    const reloaded = await loadStoreModule();
    expect(reloaded.getRefreshToken()).toBe("refresh-file");
    reloaded.clearRefreshToken();
    expect(reloaded.getRefreshToken()).toBeNull();
    expect(JSON.parse(readFileSync(credentialsFile, "utf-8"))).toEqual({
      access_token: "access",
    });
    expect(keyring.__getEntryCount()).toBe(0);
  });

  it("migrates a legacy file-stored refresh token into the keyring", async () => {
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      credentialsFile,
      `${JSON.stringify({ access_token: "access", refresh_token: "legacy" }, null, 2)}\n`,
      { mode: 0o600 },
    );

    const store = await loadStoreModule();
    expect(store.getRefreshToken()).toBe("legacy");
    expect(store.getRefreshTokenBackend()).toBe("keyring");

    const parsed = JSON.parse(readFileSync(credentialsFile, "utf-8")) as Record<
      string,
      unknown
    >;
    expect(parsed.refresh_token).toBeUndefined();
    expect(parsed.access_token).toBe("access");
  });

  it("clears both the keyring entry and any file-stored refresh token on logout", async () => {
    const store = await loadStoreModule();
    store.setRefreshToken("refresh-clear");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      credentialsFile,
      `${JSON.stringify({ access_token: "access", refresh_token: "refresh-clear" }, null, 2)}\n`,
      { mode: 0o600 },
    );

    store.clearRefreshToken();

    expect(store.getRefreshToken()).toBeNull();
    if (existsSync(credentialsFile)) {
      const parsed = JSON.parse(
        readFileSync(credentialsFile, "utf-8"),
      ) as Record<string, unknown>;
      expect(parsed.refresh_token).toBeUndefined();
    }
  });
});
