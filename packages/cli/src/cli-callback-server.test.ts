import { describe, expect, it } from "vitest";
import {
  CLI_CALLBACK_HOST,
  CLI_CALLBACK_PATH,
  buildCliCallbackUri,
  generateCallbackState,
} from "./auth-callback.js";
import { startCliCallbackServer } from "./cli-callback-server.js";

describe("startCliCallbackServer", () => {
  it("keeps listening after a state mismatch and accepts the next valid callback", async () => {
    const expectedState = generateCallbackState();
    let successCount = 0;

    const handle = await startCliCallbackServer({
      expectedState,
      port: 0,
      timeoutMs: 5_000,
      onSuccess: () => {
        successCount += 1;
      },
    });

    const base = `http://${CLI_CALLBACK_HOST}:${handle.port}${CLI_CALLBACK_PATH}`;

    const bad = await fetch(
      `${base}?state=wrong&access_token=a&refresh_token=b`,
    );
    expect(bad.status).toBe(400);
    expect(successCount).toBe(0);

    const goodUrl = new URL(buildCliCallbackUri(expectedState, handle.port));
    goodUrl.searchParams.set("access_token", "access");
    goodUrl.searchParams.set("refresh_token", "refresh");

    const good = await fetch(goodUrl);
    expect(good.status).toBe(200);
    expect(successCount).toBe(1);

    await handle.close();
  });

  it("does not close the server on bad state, so a later valid request still succeeds", async () => {
    const expectedState = "state-expected";
    const tokens: Array<{ access_token: string }> = [];

    const handle = await startCliCallbackServer({
      expectedState,
      port: 0,
      timeoutMs: 5_000,
      onSuccess: (session) => {
        tokens.push(session);
      },
    });

    const base = `http://${CLI_CALLBACK_HOST}:${handle.port}${CLI_CALLBACK_PATH}`;
    await fetch(`${base}?state=nope`);
    await fetch(`${base}?state=nope&access_token=a&refresh_token=b`);

    const ok = await fetch(
      `${base}?state=${expectedState}&access_token=access&refresh_token=refresh`,
    );
    expect(ok.status).toBe(200);
    expect(tokens).toHaveLength(1);

    await handle.close();
  });

  it("ignores duplicate success callbacks and close() is idempotent", async () => {
    const expectedState = "state-dup";
    let successCount = 0;

    const handle = await startCliCallbackServer({
      expectedState,
      port: 0,
      timeoutMs: 5_000,
      onSuccess: () => {
        successCount += 1;
      },
    });

    const base = `http://${CLI_CALLBACK_HOST}:${handle.port}${CLI_CALLBACK_PATH}`;
    const okUrl = `${base}?state=${expectedState}&access_token=access&refresh_token=refresh`;

    await fetch(okUrl);
    await fetch(okUrl);
    expect(successCount).toBe(1);

    await handle.close();
    await handle.close();
  });
});
