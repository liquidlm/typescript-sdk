import { describe, expect, it } from "vitest";
import {
  genericSnippets,
  renderConfig,
  supportsPat,
  usesRemoteOauth,
} from "../mcp-config.js";

const MCP_URL = "https://mcp.liquidlm.com/v1/mcp";
const TOKEN_PLACEHOLDER = "Bearer ${LIQUIDLM_API_TOKEN}";

describe("mcp config rendering", () => {
  it("adds the remote HTTP server to Cursor config without touching other servers", () => {
    const existing = JSON.stringify({
      mcpServers: {
        other: { command: "other-mcp" },
      },
    });

    const rendered = renderConfig("cursor", {
      pat: false,
      mcpUrl: MCP_URL,
      existing,
    });
    const parsed = JSON.parse(rendered.contents);

    expect(rendered.replaced).toBe(false);
    expect(rendered.format).toBe("json");
    expect(rendered.path.endsWith("/.cursor/mcp.json")).toBe(true);
    expect(parsed.mcpServers.other).toEqual({ command: "other-mcp" });
    expect(parsed.mcpServers.liquidlm).toEqual({ url: MCP_URL });
    expect(parsed.mcpServers.liquidlm).not.toHaveProperty("command");
    expect(parsed.mcpServers.liquidlm).not.toHaveProperty("headers");
  });

  it("replaces a Cursor stdio entry with remote HTTP on reinstall", () => {
    const existing = JSON.stringify({
      mcpServers: {
        liquidlm: { command: "liquidlm", args: ["mcp", "serve"] },
      },
    });

    const rendered = renderConfig("cursor", {
      pat: false,
      mcpUrl: MCP_URL,
      existing,
    });
    const parsed = JSON.parse(rendered.contents);

    expect(rendered.replaced).toBe(true);
    expect(parsed.mcpServers.liquidlm).toEqual({ url: MCP_URL });
  });

  it("renders Claude Code PAT config with an env-var placeholder instead of a token", () => {
    const existing = JSON.stringify({
      mcpServers: {
        liquidlm: { command: "old" },
      },
    });

    const rendered = renderConfig("claude-code", {
      pat: true,
      mcpUrl: MCP_URL,
      existing,
    });
    const parsed = JSON.parse(rendered.contents);

    expect(rendered.replaced).toBe(true);
    expect(parsed.mcpServers.liquidlm).toEqual({
      type: "http",
      url: MCP_URL,
      headers: { Authorization: TOKEN_PLACEHOLDER },
    });
    expect(rendered.contents).not.toContain("tok-");
  });

  it("uses OpenCode's mcp key and local command array for stdio", () => {
    const rendered = renderConfig("opencode", {
      pat: false,
      mcpUrl: MCP_URL,
      existing: null,
    });
    const parsed = JSON.parse(rendered.contents);

    expect(parsed).toEqual({
      mcp: {
        liquidlm: {
          type: "local",
          command: ["liquidlm", "mcp", "serve"],
          enabled: true,
        },
      },
    });
  });

  it("uses OpenCode's env expansion and disables OAuth for PAT auth", () => {
    const config = JSON.parse(
      renderConfig("opencode", { pat: true, mcpUrl: MCP_URL, existing: null })
        .contents,
    );
    expect(config.mcp.liquidlm).toMatchObject({
      oauth: false,
      headers: { Authorization: "Bearer {env:LIQUIDLM_API_TOKEN}" },
    });
  });

  it("appends a Codex stdio block and replaces it idempotently with PAT config", () => {
    const base = `[model]\nname = "gpt-5.2"\n`;
    const stdio = renderConfig("codex", {
      pat: false,
      mcpUrl: MCP_URL,
      existing: base,
    });

    expect(stdio.replaced).toBe(false);
    expect(stdio.contents).toContain(`[model]\nname = "gpt-5.2"`);
    expect(stdio.contents).toContain(`[mcp_servers.liquidlm]`);
    expect(stdio.contents).toContain(`command = "liquidlm"`);
    expect(stdio.contents).toContain(`args = ["mcp", "serve"]`);

    const pat = renderConfig("codex", {
      pat: true,
      mcpUrl: MCP_URL,
      existing: stdio.contents,
    });

    expect(pat.replaced).toBe(true);
    expect(pat.contents).toContain(`url = "${MCP_URL}"`);
    expect(pat.contents).toContain(
      `bearer_token_env_var = "LIQUIDLM_API_TOKEN"`,
    );
    expect(pat.contents).not.toContain(`command = "liquidlm"`);
  });

  it("writes a stdio entry into Claude Desktop's app config and rejects PAT", () => {
    const rendered = renderConfig("claude-desktop", {
      pat: false,
      mcpUrl: MCP_URL,
      existing: null,
    });

    expect(rendered.path).toMatch(/claude_desktop_config\.json$/);
    const parsed = JSON.parse(rendered.contents) as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    expect(parsed.mcpServers.liquidlm).toEqual({
      command: "liquidlm",
      args: ["mcp", "serve"],
    });

    // Claude Desktop's config file has no remote-HTTP shape — install must
    // refuse --pat rather than write a config the app cannot read.
    expect(supportsPat("claude-desktop")).toBe(false);
    expect(supportsPat("cursor")).toBe(true);
    expect(usesRemoteOauth("cursor")).toBe(true);
    expect(usesRemoteOauth("claude-code")).toBe(false);
  });

  it("keeps Cursor PAT as direct HTTP with an env-var placeholder", () => {
    const rendered = renderConfig("cursor", {
      pat: true,
      mcpUrl: MCP_URL,
      existing: null,
    });
    const parsed = JSON.parse(rendered.contents);

    expect(parsed.mcpServers.liquidlm).toEqual({
      url: MCP_URL,
      headers: { Authorization: "Bearer ${env:LIQUIDLM_API_TOKEN}" },
    });
  });

  it("prints generic stdio and PAT snippets", () => {
    const snippets = genericSnippets(MCP_URL);
    expect(JSON.parse(snippets.oauth)).toEqual({
      mcpServers: { liquidlm: { url: MCP_URL } },
    });

    expect(JSON.parse(snippets.stdio)).toEqual({
      mcpServers: {
        liquidlm: {
          command: "liquidlm",
          args: ["mcp", "serve"],
        },
      },
    });
    expect(JSON.parse(snippets.pat)).toEqual({
      mcpServers: {
        liquidlm: {
          url: MCP_URL,
          headers: { Authorization: TOKEN_PLACEHOLDER },
        },
      },
    });
  });
});
