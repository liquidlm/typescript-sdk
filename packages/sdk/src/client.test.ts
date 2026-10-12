import { describe, expect, it, vi } from "vitest";
import { LiquidLMClient, LiquidLMError } from "./client.js";

function client(
  reply: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  options = {},
) {
  const fetch = vi.fn(reply);
  return {
    sdk: new LiquidLMClient({
      baseUrl: "https://memory.example/api",
      token: "test-private-token",
      fetch,
      ...options,
    }),
    fetch,
  };
}
describe("portable SDK transport", () => {
  it("sends QUERY with the caller's base URL, fresh token and organization", async () => {
    const token = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");
    const { sdk, fetch } = client(async () => Response.json({ results: [] }), {
      token,
      activeOrg: "org-fixture",
    });
    await sdk.query("/search/hybrid", { query: "meeting", limit: 2 });
    await sdk.get("/vaults");
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://memory.example/api/v1/search/hybrid");
    expect(init?.method).toBe("QUERY");
    expect(JSON.parse(init?.body as string)).toEqual({
      query: "meeting",
      limit: 2,
    });
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer first",
    );
    expect(new Headers(init?.headers).get("X-LiquidLM-Active-Org")).toBe(
      "org-fixture",
    );
    expect(
      new Headers(fetch.mock.calls[1][1]?.headers).get("Authorization"),
    ).toBe("Bearer second");
    expect(init?.redirect).toBe("error");
  });
  it.each([
    "https://other.example/steal",
    "//other.example/steal",
    "../../steal",
    "/../steal",
    "\\\\other.example",
    "vaults#fragment",
  ])("rejects credential-escaping path %s", async (path) => {
    const { sdk, fetch } = client(async () => Response.json({}));
    await expect(sdk.get(path)).rejects.toThrow(TypeError);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not retain response bodies or transport error secrets in exceptions", async () => {
    const { sdk } = client(async () =>
      Response.json(
        { message: "test-private-token", secret: "never-log" },
        { status: 401, headers: { "x-request-id": "request-fixture" } },
      ),
    );
    const error = await sdk.get("/vaults").catch((e) => e);
    expect(error).toBeInstanceOf(LiquidLMError);
    expect(error.status).toBe(401);
    expect(error.requestId).toBe("request-fixture");
    expect(JSON.stringify(error) + String(error)).not.toMatch(
      /test-private-token|never-log/,
    );
    const network = client(async () => {
      throw new Error("https://secret.example?token=private");
    });
    await expect(network.sdk.get("/vaults")).rejects.toMatchObject({
      code: "network_error",
      message: "LiquidLM network request failed",
    });
  });
  it("keeps writes single-attempt even when read retries are enabled", async () => {
    const { sdk, fetch } = client(
      async () => new Response(null, { status: 503 }),
      { maxRetries: 3 },
    );
    await expect(sdk.post("/vaults", { label: "new" })).rejects.toMatchObject({
      status: 503,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("retries an explicitly enabled idempotent read", async () => {
    let attempts = 0;
    const { sdk, fetch } = client(
      async () =>
        ++attempts === 1
          ? new Response(null, { status: 503 })
          : Response.json([]),
      { maxRetries: 1 },
    );
    expect(await sdk.get("/vaults")).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("supports cancellation and bounded timeouts without leaking fetch errors", async () => {
    const fetch = async (_: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new Error("private request URL")),
          { once: true },
        );
        if (init?.signal?.aborted) reject(new Error("private request URL"));
      });
    const sdk = new LiquidLMClient({ fetch, timeoutMs: 10 });
    await expect(sdk.get("/vaults")).rejects.toMatchObject({ code: "timeout" });
    const controller = new AbortController();
    controller.abort();
    await expect(
      sdk.get("/vaults", { signal: controller.signal }),
    ).rejects.toMatchObject({ code: "cancelled" });
  });
  it("bounds response bodies and rejects malformed JSON", async () => {
    const large = client(async () => new Response('"123456789"'), {
      maxResponseBytes: 4,
    });
    await expect(large.sdk.get("/vaults")).rejects.toMatchObject({
      code: "response_too_large",
    });
    const bad = client(async () => new Response("not-json"));
    await expect(bad.sdk.get("/vaults")).rejects.toMatchObject({
      code: "invalid_json",
    });
  });
  it("encodes typed operation path parameters and omits undefined query parameters", async () => {
    const { sdk, fetch } = client(async () => Response.json([]));
    await sdk.call("getVaults");
    expect(fetch.mock.calls[0][0]).toBe("https://memory.example/api/v1/vaults");
  });
  it("handles empty successful responses", async () => {
    const { sdk } = client(async () => new Response(null, { status: 204 }));
    expect(await sdk.delete("/vaults/fixture")).toBeUndefined();
  });
  it("reads fragmented SSE with multiline data and releases streams on early exit", async () => {
    const encoder = new TextEncoder();
    let cancelled = false;
    const source = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(encoder.encode("event: token\r\nid: fixture\r\ndata: fir"));
        c.enqueue(encoder.encode("st\r\ndata: second\r\n\r\n"));
      },
      cancel() {
        cancelled = true;
      },
    });
    const { sdk } = client(async () => new Response(source));
    for await (const event of sdk.stream("/chat/completions", {
      input: "fixture",
    })) {
      expect(event).toEqual({
        event: "token",
        id: "fixture",
        data: "first\nsecond",
      });
      break;
    }
    expect(cancelled).toBe(true);
  });
  it("paginates with bounded offsets and stops at the server's end marker", async () => {
    let page = 0;
    const { sdk, fetch } = client(async () =>
      Response.json({
        items: [{ id: `item-${++page}` }],
        hasMore: page < 2,
        total: 2,
      }),
    );
    const ids: string[] = [];
    for await (const item of sdk.listKnowledge({ limit: 1 })) ids.push(item.id);
    expect(ids).toEqual(["item-1", "item-2"]);
    expect(fetch.mock.calls[1][0]).toContain("offset=1");
  });
  it("rejects non-progressing pagination rather than looping forever", async () => {
    const { sdk } = client(async () =>
      Response.json({ items: [], hasMore: true, total: 1 }),
    );
    await expect(sdk.listKnowledge().next()).rejects.toMatchObject({
      code: "invalid_pagination",
    });
  });
  it("permits explicit unauthenticated discovery without sending a bearer", async () => {
    const { sdk, fetch } = client(async () => Response.json({}));
    await sdk.get("/auth/oidc/config", { authenticated: false });
    expect(
      new Headers(fetch.mock.calls[0][1]?.headers).has("Authorization"),
    ).toBe(false);
  });
  it("validates timeout before acquiring credentials or abort listeners", async () => {
    const signal = new AbortController().signal;
    const listener = vi.spyOn(signal, "addEventListener");
    const token = vi.fn(() => "fixture");
    const { sdk, fetch } = client(async () => Response.json({}), { token });
    await expect(sdk.get("/vaults", { timeoutMs: 0, signal })).rejects.toThrow(
      /timeoutMs/,
    );
    expect(token).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("parses lone CR and fragmented CRLF without inventing empty events", async () => {
    const encoder = new TextEncoder();
    const source = new ReadableStream<Uint8Array>({
      start(c) {
        for (const chunk of [
          "data: first\r",
          "\ndata: second\r",
          "\rdata: third\n\n",
        ])
          c.enqueue(encoder.encode(chunk));
        c.close();
      },
    });
    const { sdk } = client(async () => new Response(source));
    const events = [];
    for await (const event of sdk.stream("/chat/completions", {}))
      events.push(event);
    expect(events).toEqual([
      { event: "message", data: "first\nsecond" },
      { event: "message", data: "third" },
    ]);
  });
});
