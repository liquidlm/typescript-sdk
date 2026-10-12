import { afterEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  fetchOidcConfig,
  startDeviceAuthorization,
  pollForDeviceTokens,
} from "./oidc-device.js";

const config = {
  issuer: "https://identity.example.test/realm",
  clientId: "fixture-cli",
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("discovers the native client without forwarding a bearer", async () => {
  const fetch = vi.fn().mockResolvedValue(
    Response.json({
      issuer: config.issuer,
      clients: { cli: config.clientId },
    }),
  );
  vi.stubGlobal("fetch", fetch);
  expect(await fetchOidcConfig("https://memory.example.test/v1")).toEqual(
    config,
  );
  expect(new Headers(fetch.mock.calls[0][1].headers).has("Authorization")).toBe(
    false,
  );
});
it("reports unsupported discovery as unavailable", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
  );
  expect(await fetchOidcConfig("https://memory.example.test/v1")).toBeNull();
});
it("binds the device grant to a fresh S256 verifier without a client secret", async () => {
  const fetch = vi.fn().mockResolvedValue(
    Response.json({
      device_code: "fixture-device",
      user_code: "fixture-code",
      verification_uri: "https://identity.example.test/verify",
      expires_in: 60,
      interval: 1,
    }),
  );
  vi.stubGlobal("fetch", fetch);
  const authorization = await startDeviceAuthorization(config);
  const form = new URLSearchParams(fetch.mock.calls[0][1].body);
  expect(form.get("code_challenge")).toBe(
    createHash("sha256")
      .update(authorization.code_verifier!)
      .digest("base64url"),
  );
  expect(form.get("code_challenge_method")).toBe("S256");
  expect(form.has("client_secret")).toBe(false);
  expect(form.has("code_verifier")).toBe(false);
});
it("does not expose a failed provider response body", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("fixture-private-response", { status: 400 }),
      ),
  );
  await expect(startDeviceAuthorization(config)).rejects.toThrow(
    "Device authorization failed (400)",
  );
});
it("honors pending and slow_down before exchanging the verifier for tokens", async () => {
  vi.useFakeTimers();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ error: "authorization_pending" }, { status: 400 }),
    )
    .mockResolvedValueOnce(
      Response.json({ error: "slow_down" }, { status: 400 }),
    )
    .mockResolvedValueOnce(
      Response.json({
        access_token: "fixture-access",
        refresh_token: "fixture-refresh",
        token_type: "Bearer",
        expires_in: 600,
      }),
    );
  vi.stubGlobal("fetch", fetch);
  const result = pollForDeviceTokens(config, {
    device_code: "fixture-device",
    user_code: "fixture-code",
    verification_uri: "https://identity.example.test/verify",
    expires_in: 60,
    interval: 1,
    code_verifier: "fixture-verifier",
  });
  await vi.advanceTimersByTimeAsync(1000);
  expect(fetch).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1000);
  expect(fetch).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(5999);
  expect(fetch).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(
    new URLSearchParams(fetch.mock.calls[2][1].body).get("code_verifier"),
  ).toBe("fixture-verifier");
  await expect(result).resolves.toMatchObject({
    access_token: "fixture-access",
  });
});
