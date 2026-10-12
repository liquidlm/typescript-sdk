import { existsSync, readFileSync } from "node:fs";
import { Entry } from "@napi-rs/keyring";
import { CONFIG_DIR, CREDENTIALS_FILE } from "./config.js";
import { ensurePrivateDir, writePrivateFile } from "./local-secrets.js";
import { debug } from "./debug.js";

const SERVICE = "liquidlm";
const ACCOUNT = "refresh_token";

export type RefreshTokenBackend = "keyring" | "file";

let activeBackend: RefreshTokenBackend | null = null;

function keyringEntry(): Entry {
  return new Entry(SERVICE, ACCOUNT);
}

function withKeyring<T>(fn: (entry: Entry) => T): T | null {
  // Secret Service can block synchronously on headless Linux instead of
  // throwing. An explicit file backend must never probe or migrate to it.
  if (process.env.LIQUIDLM_CREDENTIAL_STORE === "file") return null;
  try {
    return fn(keyringEntry());
  } catch (err) {
    debug(
      `OS keychain unavailable, using credentials file fallback: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }
}

export function getRefreshTokenBackend(): RefreshTokenBackend | null {
  return activeBackend;
}

function readCredentialsFile(): Record<string, unknown> | null {
  if (!existsSync(CREDENTIALS_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CREDENTIALS_FILE, "utf-8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

function writeCredentialsFile(data: Record<string, unknown>): void {
  ensurePrivateDir(CONFIG_DIR);
  writePrivateFile(CREDENTIALS_FILE, `${JSON.stringify(data, null, 2)}\n`);
}

function readRefreshFromFile(): string | null {
  const creds = readCredentialsFile();
  const token = creds?.refresh_token;
  return typeof token === "string" && token.trim() ? token : null;
}

function stripRefreshFromFile(): void {
  const creds = readCredentialsFile();
  if (!creds || !("refresh_token" in creds)) return;
  const { refresh_token: _removed, ...rest } = creds;
  writeCredentialsFile(rest);
}

export function getRefreshToken(): string | null {
  const fromKeyring = withKeyring((entry) => entry.getPassword());
  if (fromKeyring) {
    activeBackend = "keyring";
    return fromKeyring;
  }

  const fromFile = readRefreshFromFile();
  if (!fromFile) return null;

  const migrated = withKeyring((entry) => {
    entry.setPassword(fromFile);
    return true;
  });
  if (migrated) {
    stripRefreshFromFile();
    activeBackend = "keyring";
    console.error(
      "Migrated refresh token from credentials file to OS keychain.",
    );
    return fromFile;
  }

  activeBackend = "file";
  return fromFile;
}

export function setRefreshToken(token: string): void {
  const stored = withKeyring((entry) => {
    entry.setPassword(token);
    return true;
  });
  if (stored) {
    stripRefreshFromFile();
    activeBackend = "keyring";
    debug("Refresh token stored in OS keychain.");
    return;
  }

  activeBackend = "file";
  const creds = readCredentialsFile() ?? {};
  writeCredentialsFile({ ...creds, refresh_token: token });
  debug("Refresh token stored in credentials file (keychain unavailable).");
}

export function clearRefreshToken(): void {
  withKeyring((entry) => {
    try {
      entry.deletePassword();
    } catch {
      // No entry is fine on logout.
    }
    return true;
  });
  stripRefreshFromFile();
  activeBackend = null;
}
