/**
 * Resilient MCP proxy behavior (Gate-3 Cursor finding, 2026-07-13): the serve
 * process must never die on auth/connect problems — it reports them per
 * request and self-heals once the user logs in, with no client restart.
 */
import { describe, expect, it, vi } from "vitest";
import { createProxyHandlers, type RemoteMcp } from "./mcp.js";

function fakeRemote(overrides: Partial<RemoteMcp> = {}): RemoteMcp {
  return {
    listTools: vi.fn().mockResolvedValue({ tools: [] }),
    callTool: vi.fn().mockResolvedValue({ content: [] }),
    close: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as RemoteMcp;
}

describe("createProxyHandlers", () => {
  it("rejects with a login hint when signed out, without connecting", async () => {
    const connect = vi.fn();
    const handlers = createProxyHandlers({ isLoggedIn: () => false, connect });

    await expect(handlers.listTools()).rejects.toThrow(/liquidlm login/);
    expect(connect).not.toHaveBeenCalled();
  });

  it("recovers after a failed connect: next request reconnects", async () => {
    const remote = fakeRemote();
    const connect = vi
      .fn()
      .mockRejectedValueOnce(new Error("401 unauthorized"))
      .mockResolvedValueOnce(remote);
    const handlers = createProxyHandlers({ isLoggedIn: () => true, connect });

    await expect(handlers.listTools()).rejects.toThrow(
      /Could not reach the LiquidLM MCP server: 401 unauthorized/,
    );
    await expect(handlers.listTools()).resolves.toEqual({ tools: [] });
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it("memoizes a healthy connection across requests", async () => {
    const remote = fakeRemote();
    const connect = vi.fn().mockResolvedValue(remote);
    const handlers = createProxyHandlers({ isLoggedIn: () => true, connect });

    await handlers.listTools();
    await handlers.callTool({ name: "search_knowledge", arguments: {} });

    expect(connect).toHaveBeenCalledTimes(1);
    expect(remote.callTool).toHaveBeenCalledWith({
      name: "search_knowledge",
      arguments: {},
    });
  });

  it("drops the connection on a transport-level throw and reconnects next request", async () => {
    const broken = fakeRemote({
      listTools: vi.fn().mockRejectedValue(new Error("fetch failed")),
    });
    const healthy = fakeRemote();
    const connect = vi
      .fn()
      .mockResolvedValueOnce(broken)
      .mockResolvedValueOnce(healthy);
    const handlers = createProxyHandlers({ isLoggedIn: () => true, connect });

    await expect(handlers.listTools()).rejects.toThrow("fetch failed");
    expect(broken.close).toHaveBeenCalled();

    await expect(handlers.listTools()).resolves.toEqual({ tools: [] });
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it("signed-out mid-session drops back to the login hint, then heals", async () => {
    let loggedIn = false;
    const remote = fakeRemote();
    const connect = vi.fn().mockResolvedValue(remote);
    const handlers = createProxyHandlers({
      isLoggedIn: () => loggedIn,
      connect,
    });

    await expect(handlers.callTool({ name: "t" })).rejects.toThrow(
      /liquidlm login/,
    );
    loggedIn = true;
    await expect(handlers.callTool({ name: "t" })).resolves.toEqual({
      content: [],
    });
  });
});
