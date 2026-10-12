import { describe, expect, it } from "vitest";
import {
  buildCliCallbackUri,
  CLI_CALLBACK_HOST,
  CLI_CALLBACK_PATH,
  CLI_CALLBACK_PORT,
  dispositionCliCallback,
  generateCallbackState,
  validateCallbackState,
} from "./auth-callback.js";

describe("CLI auth callback helpers", () => {
  it("builds a loopback callback URI with state", () => {
    const uri = buildCliCallbackUri("state-123");
    const parsed = new URL(uri);
    expect(parsed.protocol).toBe("http:");
    expect(parsed.hostname).toBe(CLI_CALLBACK_HOST);
    expect(parsed.port).toBe(String(CLI_CALLBACK_PORT));
    expect(parsed.pathname).toBe(CLI_CALLBACK_PATH);
    expect(parsed.searchParams.get("state")).toBe("state-123");
  });

  it("builds callback URIs for arbitrary listener ports", () => {
    const uri = buildCliCallbackUri("state-123", 54321);
    expect(uri).toBe("http://127.0.0.1:54321/callback?state=state-123");
  });

  it("generates unique callback state values", () => {
    const a = generateCallbackState();
    const b = generateCallbackState();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });

  it("accepts matching state and rejects missing or mismatched state", () => {
    expect(validateCallbackState("abc", "abc")).toBe(true);
    expect(validateCallbackState("abc", "def")).toBe(false);
    expect(validateCallbackState(null, "abc")).toBe(false);
    expect(validateCallbackState("", "abc")).toBe(false);
  });
});

describe("dispositionCliCallback", () => {
  it("rejects callbacks without state", () => {
    const url = new URL(
      `http://${CLI_CALLBACK_HOST}:${CLI_CALLBACK_PORT}${CLI_CALLBACK_PATH}`,
    );
    expect(dispositionCliCallback(url, "expected")).toEqual({
      kind: "bad_state",
    });
  });

  it("accepts valid state and tokens", () => {
    const url = new URL(buildCliCallbackUri("expected"));
    url.searchParams.set("access_token", "access");
    url.searchParams.set("refresh_token", "refresh");
    url.searchParams.set("expires_in", "3600");

    expect(dispositionCliCallback(url, "expected")).toEqual({
      kind: "success",
      tokens: {
        access_token: "access",
        refresh_token: "refresh",
        token_type: "bearer",
        expires_in: 3600,
      },
    });
  });
});
