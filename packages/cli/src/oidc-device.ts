import { LiquidLMClient } from "@liquidlm/sdk";
/**
 * OAuth 2.0 Device Authorization Grant against Keycloak (RFC 8628) —
 *
 * The CLI is the public `liquidlm-cli` client and talks to Keycloak
 * directly: it asks for a device/user code, points the user at the
 * verification URL (any browser, any machine — this replaces both the
 * loopback and the manual paste flows), and polls the token endpoint until
 * the user approves. Refresh goes through the API's /auth/refresh body path
 * with the client_id so the server proxies the public-client grant.
 *
 * The `liquidlm-cli` client enforces PKCE (S256), so the device flow carries a
 * challenge on the authorization request and the verifier on the token poll —
 * Keycloak supports PKCE for the device grant and rejects the request without
 * it ("Missing parameter: code_challenge_method").
 */

import { createHash, randomBytes } from "node:crypto";

export interface CliOidcConfig {
  issuer: string;
  clientId: string;
}

function generatePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

/** Null when the API has no Keycloak configured. */
export async function fetchOidcConfig(
  apiUrl: string,
): Promise<CliOidcConfig | null> {
  try {
    const res = await new LiquidLMClient({ baseUrl: apiUrl }).raw(
      "GET",
      "/auth/oidc/config",
      { authenticated: false, timeoutMs: 10_000 },
    );
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }
    const data = (await res.json()) as {
      issuer?: string;
      clients?: { cli?: string };
    };
    if (!data.issuer || !data.clients?.cli) return null;
    return { issuer: data.issuer, clientId: data.clients.cli };
  } catch {
    return null;
  }
}

export interface DeviceAuthorization {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval?: number;
  /** PKCE verifier generated client-side; replayed on the token poll. */
  code_verifier?: string;
}

export async function startDeviceAuthorization(
  config: CliOidcConfig,
): Promise<DeviceAuthorization> {
  const { verifier, challenge } = generatePkce();
  const res = await fetch(
    `${config.issuer}/protocol/openid-connect/auth/device`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        scope: "openid email profile",
        code_challenge: challenge,
        code_challenge_method: "S256",
      }).toString(),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!res.ok) {
    await res.body?.cancel();
    throw new Error(`Device authorization failed (${res.status})`);
  }
  const authorization = (await res.json()) as DeviceAuthorization;
  return { ...authorization, code_verifier: verifier };
}

export interface DeviceTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Poll the token endpoint until approval. Honors the server's `interval`
 * and `slow_down` backoff (RFC 8628 §3.5).
 */
export async function pollForDeviceTokens(
  config: CliOidcConfig,
  authorization: DeviceAuthorization,
): Promise<DeviceTokens> {
  let intervalMs = (authorization.interval ?? 5) * 1000;
  const deadline = Date.now() + authorization.expires_in * 1000;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    const res = await fetch(`${config.issuer}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        client_id: config.clientId,
        device_code: authorization.device_code,
        ...(authorization.code_verifier
          ? { code_verifier: authorization.code_verifier }
          : {}),
      }).toString(),
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      return (await res.json()) as DeviceTokens;
    }

    const body = (await res.json().catch(() => ({}))) as { error?: string };
    switch (body.error) {
      case "authorization_pending":
        continue;
      case "slow_down":
        intervalMs += 5000;
        continue;
      case "expired_token":
        throw new Error(
          "The sign-in code expired. Run `liquidlm login` again.",
        );
      case "access_denied":
        throw new Error("Sign-in was denied in the browser.");
      default:
        throw new Error(
          `Login failed (${res.status}): ${body.error ?? "unexpected response"}`,
        );
    }
  }

  throw new Error("Login timed out waiting for browser approval.");
}
