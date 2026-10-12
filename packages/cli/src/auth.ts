import { LiquidLMClient } from "@liquidlm/sdk";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import open from "open";
import { CONFIG_DIR, CREDENTIALS_FILE, getApiUrl } from "./config.js";
import {
  ensurePrivateDir,
  hardenPrivateFile,
  writePrivateFile,
} from "./local-secrets.js";
import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from "./refresh-token-store.js";
import { debug } from "./debug.js";
import {
  fetchOidcConfig,
  pollForDeviceTokens,
  startDeviceAuthorization,
} from "./oidc-device.js";

interface Credentials {
  access_token: string;
  /** Present only when the OS keychain is unavailable (file fallback). */
  refresh_token?: string;
  token_type: string;
  expires_at: number;
  /** Set for Keycloak device-grant sessions; refresh goes through the API with this client. */
  provider?: "keycloak";
  client_id?: string;
  /** Active org the CLI targets; `mcp serve` forwards it as X-LiquidLM-Active-Org. */
  activeOrgId?: string | null;
  activeOrgName?: string;
}

function readCredentials(): Credentials | null {
  ensurePrivateDir(CONFIG_DIR);
  hardenPrivateFile(CREDENTIALS_FILE);
  if (!existsSync(CREDENTIALS_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CREDENTIALS_FILE, "utf-8")) as Credentials;
  } catch {
    return null;
  }
}

function writeCredentials(creds: Credentials): void {
  ensurePrivateDir(CONFIG_DIR);
  const { refresh_token: inlineRefresh, ...rest } = creds;
  // Read before replacing the file: headless Linux stores its refresh token
  // here when no OS keychain is available. Write it back AFTER the credentials.
  const refresh = inlineRefresh || getRefreshToken();
  writePrivateFile(CREDENTIALS_FILE, `${JSON.stringify(rest, null, 2)}\n`);
  if (refresh) setRefreshToken(refresh);
}

/**
 * Login via the Keycloak Device Authorization Grant. It covers both "browser
 * on this machine" and "open the link anywhere" in one flow.
 */
export async function login(): Promise<void> {
  const oidc = await fetchOidcConfig(getApiUrl());
  if (!oidc) {
    throw new Error("Keycloak login is not configured on this API.");
  }
  await loginDeviceGrant(oidc);
}

async function loginDeviceGrant(
  oidc: NonNullable<Awaited<ReturnType<typeof fetchOidcConfig>>>,
): Promise<void> {
  const authorization = await startDeviceAuthorization(oidc);

  const verifyUrl =
    authorization.verification_uri_complete ?? authorization.verification_uri;

  console.log("\nTo sign in, open this link in any browser (any device):\n");
  console.log(`  ${verifyUrl}\n`);
  if (!authorization.verification_uri_complete) {
    console.log(
      `Device code (enter this on the verification page): ${authorization.user_code}\n`,
    );
  } else {
    console.log(
      `Device code (only if Keycloak asks you to confirm this device): ${authorization.user_code}\n`,
    );
  }
  console.log(
    "If Keycloak emails you a sign-in code, enter the emailed code in the browser.\n",
  );

  // Best effort: also open the local browser. The printed link keeps the
  // headless/SSH case working.
  open(verifyUrl).catch(() => {});

  console.log("Waiting for sign-in to complete...");
  const tokens = await pollForDeviceTokens(oidc, authorization);

  writeCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_type: tokens.token_type,
    expires_at: Date.now() + tokens.expires_in * 1000,
    provider: "keycloak",
    client_id: oidc.clientId,
  });

  await primeActiveOrg(tokens.access_token);
  console.log("Login successful! Credentials saved.");
  process.exit(0);
}

/** Active-org state used by `org` commands, `whoami`, and the stdio MCP proxy. */
export function getCredentials(): Credentials | null {
  return readCredentials();
}

export function getActiveOrgId(): string | null {
  return readCredentials()?.activeOrgId ?? null;
}

export function getActiveOrgName(): string | undefined {
  return readCredentials()?.activeOrgName;
}

export function setActiveOrg(orgId: string | null, orgName?: string): void {
  const creds = readCredentials();
  if (!creds) throw new Error("Not logged in. Run `liquidlm login` first.");
  writeCredentials({ ...creds, activeOrgId: orgId, activeOrgName: orgName });
}

/**
 * After login, default the active org to the user's default (or first) org when
 * none is stored yet. Non-fatal — the org can always be set via `org use`.
 */
async function primeActiveOrg(accessToken: string): Promise<void> {
  if (readCredentials()?.activeOrgId) return;
  try {
    const apiUrl = getApiUrl();
    const res = await new LiquidLMClient({
      baseUrl: apiUrl,
      token: accessToken,
    }).raw("GET", "/account/organizations");
    if (!res.ok) {
      await res.body?.cancel();
      return;
    }
    const orgs = (await res.json()) as Array<{
      id: string;
      name: string;
      is_default?: boolean;
    }>;
    if (!Array.isArray(orgs) || orgs.length === 0) return;
    const chosen = orgs.find((o) => o.is_default) ?? orgs[0]!;
    setActiveOrg(chosen.id, chosen.name);
  } catch {
    // Non-fatal — leave active org unset.
  }
}

export function logout(): void {
  clearRefreshToken();
  if (existsSync(CREDENTIALS_FILE)) {
    unlinkSync(CREDENTIALS_FILE);
    console.log("Logged out. Credentials removed.");
    return;
  }
  console.log("Not logged in.");
}

/** Headless PATs take precedence over the interactive CLI session. */
export function getEnvironmentToken(): string | undefined {
  return (
    process.env.LIQUIDLM_API_TOKEN?.trim() ||
    process.env.LIQUIDLM_TOKEN?.trim() ||
    undefined
  );
}

let tokenRequest: Promise<string> | undefined;

export async function getToken(): Promise<string> {
  const envToken = getEnvironmentToken();
  if (envToken) return envToken;
  // Keycloak rotates refresh tokens. Concurrent MCP requests must share one
  // refresh instead of spending the same refresh token twice.
  tokenRequest ??= getSessionToken().finally(() => {
    tokenRequest = undefined;
  });
  return tokenRequest;
}

async function getSessionToken(): Promise<string> {
  const creds = readCredentials();
  if (!creds) {
    throw new Error("Not logged in. Run `liquidlm login` first.");
  }

  // Refresh if token expires within the next 60 seconds
  if (Date.now() >= creds.expires_at - 60_000) {
    debug(
      `Token expired (expires_at=${new Date(creds.expires_at).toISOString()}, now=${new Date().toISOString()})`,
    );
    // Status to stderr so callers like `token export` keep stdout clean for piping.
    console.error("Access token expired, refreshing...");
    try {
      const apiUrl = getApiUrl();
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new Error("No refresh token available.");
      }

      // Keycloak sessions carry the issuing public client_id so the API can
      // proxy the refresh grant (tokens are bound to the issuing client).
      if (creds.provider !== "keycloak" || !creds.client_id) {
        throw new Error(
          "Stored credentials are from a retired login flow. Run `liquidlm login` again.",
        );
      }

      const body = {
        refresh_token: refreshToken,
        provider: "keycloak",
        client_id: creds.client_id,
      };

      const response = await new LiquidLMClient({ baseUrl: apiUrl }).raw(
        "POST",
        "/auth/refresh",
        {
          authenticated: false,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`Refresh failed (${response.status})`);
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
      };

      const refreshed: Credentials = {
        ...creds,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type,
        expires_at: Date.now() + data.expires_in * 1000,
      };
      writeCredentials(refreshed);
      return refreshed.access_token;
    } catch (err) {
      // Do not retain provider/network objects in credential errors.
      // eslint-disable-next-line preserve-caught-error
      throw new Error(
        `Failed to refresh token. Please run \`liquidlm login\` again. (${err instanceof Error ? err.message : err})`,
      );
    }
  }

  return creds.access_token;
}

export function isLoggedIn(): boolean {
  return Boolean(getEnvironmentToken() || getRefreshToken());
}
