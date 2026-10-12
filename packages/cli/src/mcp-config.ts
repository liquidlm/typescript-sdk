/**
 * Pure config rendering for `liquidlm mcp install`. No filesystem access —
 * the command layer reads/writes; this module decides *what* to write so the
 * per-client shapes are unit-testable without touching real client configs.
 *
 * Transports:
 *  - Cursor (default): remote HTTP URL only. Cursor holds OAuth itself via
 *    `agent mcp login liquidlm` — no CLI session or keyring in the child.
 *  - Other clients (default): stdio via `liquidlm mcp serve` — the CLI
 *    manages the bearer; no token in any config file.
 *  - `--pat`: direct HTTP to `/v1/mcp` reading `$LIQUIDLM_API_TOKEN`.
 */
import { homedir } from "node:os";
import { join } from "node:path";
import { CLI_NAME } from "./branding.js";

export type McpClient =
  | "cursor"
  | "claude-code"
  | "claude-desktop"
  | "codex"
  | "opencode";
export const MCP_CLIENTS: readonly McpClient[] = [
  "cursor",
  "claude-code",
  "claude-desktop",
  "codex",
  "opencode",
];

export const SERVER_NAME = "liquidlm";
const STDIO_COMMAND = CLI_NAME;
const STDIO_ARGS = ["mcp", "serve"];
/** Literal placeholder so we never write a real token into a config file. */
const PAT_ENV = "LIQUIDLM_API_TOKEN";
const PAT_PLACEHOLDER = "${" + PAT_ENV + "}";

export function isMcpClient(value: string): value is McpClient {
  return (MCP_CLIENTS as readonly string[]).includes(value);
}

export function configPath(client: McpClient): string {
  const home = homedir();
  switch (client) {
    case "cursor":
      return join(home, ".cursor", "mcp.json");
    case "claude-code":
      return join(home, ".claude.json");
    case "claude-desktop":
      // Claude Desktop reads a per-OS app-config file (no CLI-style dotfile).
      if (process.platform === "darwin") {
        return join(
          home,
          "Library",
          "Application Support",
          "Claude",
          "claude_desktop_config.json",
        );
      }
      if (process.platform === "win32") {
        return join(
          process.env.APPDATA ?? join(home, "AppData", "Roaming"),
          "Claude",
          "claude_desktop_config.json",
        );
      }
      return join(home, ".config", "Claude", "claude_desktop_config.json");
    case "codex":
      return join(home, ".codex", "config.toml");
    case "opencode":
      return join(home, ".config", "opencode", "opencode.json");
  }
}

/**
 * Claude Desktop's config file only understands stdio servers (remote HTTP
 * connectors are added in the app's own settings UI, not this file), so the
 * `--pat` direct-HTTP shape has nowhere to go.
 */
export function supportsPat(client: McpClient): boolean {
  return client !== "claude-desktop";
}

/** Cursor talks to `/v1/mcp` over HTTP and runs its own OAuth browser flow. */
export function usesRemoteOauth(client: McpClient): boolean {
  return client === "cursor";
}

export function configFormat(client: McpClient): "json" | "toml" {
  return client === "codex" ? "toml" : "json";
}

/** Top-level key under which a JSON client stores its MCP servers. */
function jsonServersKey(client: McpClient): string {
  return client === "opencode" ? "mcp" : "mcpServers";
}

/** The server entry object for a JSON client. */
function jsonEntry(
  client: McpClient,
  pat: boolean,
  mcpUrl: string,
): Record<string, unknown> {
  if (!pat) {
    if (usesRemoteOauth(client)) {
      return { url: mcpUrl };
    }
    if (client === "opencode") {
      return {
        type: "local",
        command: [STDIO_COMMAND, ...STDIO_ARGS],
        enabled: true,
      };
    }
    return { command: STDIO_COMMAND, args: STDIO_ARGS };
  }
  const headers = { Authorization: `Bearer ${PAT_PLACEHOLDER}` };
  if (client === "opencode") {
    return {
      type: "remote",
      url: mcpUrl,
      enabled: true,
      oauth: false,
      headers: { Authorization: `Bearer {env:${PAT_ENV}}` },
    };
  }
  if (client === "claude-code") {
    return { type: "http", url: mcpUrl, headers };
  }
  return {
    url: mcpUrl,
    headers: { Authorization: `Bearer ${"${env:" + PAT_ENV + "}"}` },
  };
}

/** The codex (TOML) `[mcp_servers.liquidlm]` block, trailing newline included. */
function tomlBlock(pat: boolean, mcpUrl: string): string {
  const lines = [`[mcp_servers.${SERVER_NAME}]`];
  if (pat) {
    lines.push(`url = "${mcpUrl}"`);
    lines.push(`bearer_token_env_var = "${PAT_ENV}"`);
  } else {
    lines.push(`command = "${STDIO_COMMAND}"`);
    lines.push(`args = [${STDIO_ARGS.map((a) => `"${a}"`).join(", ")}]`);
  }
  return lines.join("\n") + "\n";
}

export interface RenderedConfig {
  path: string;
  format: "json" | "toml";
  /** Full file contents after merging the liquidlm entry. */
  contents: string;
  /** True when an existing liquidlm entry was replaced (idempotent re-install). */
  replaced: boolean;
}

function mergeJson(
  client: McpClient,
  pat: boolean,
  mcpUrl: string,
  existing: string | null,
): { contents: string; replaced: boolean } {
  let root: Record<string, unknown> = {};
  if (existing && existing.trim() !== "") {
    const parsed = JSON.parse(existing) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      root = parsed as Record<string, unknown>;
    }
  }
  const key = jsonServersKey(client);
  const container =
    root[key] && typeof root[key] === "object" && !Array.isArray(root[key])
      ? (root[key] as Record<string, unknown>)
      : {};
  const replaced = Object.prototype.hasOwnProperty.call(container, SERVER_NAME);
  container[SERVER_NAME] = jsonEntry(client, pat, mcpUrl);
  root[key] = container;
  return { contents: JSON.stringify(root, null, 2) + "\n", replaced };
}

function mergeToml(
  pat: boolean,
  mcpUrl: string,
  existing: string | null,
): { contents: string; replaced: boolean } {
  const block = tomlBlock(pat, mcpUrl);
  if (!existing || existing.trim() === "") {
    return { contents: block, replaced: false };
  }
  const header = `[mcp_servers.${SERVER_NAME}]`;
  const lines = existing.split("\n");
  const start = lines.findIndex((l) => l.trim() === header);
  if (start === -1) {
    const base = existing.replace(/\n+$/, "");
    return { contents: `${base}\n\n${block}`, replaced: false };
  }
  // Replace from the header to the next top-level section (or EOF).
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*\[/.test(lines[i]!)) {
      end = i;
      break;
    }
  }
  const merged = [
    ...lines.slice(0, start),
    block.replace(/\n$/, ""),
    ...lines.slice(end),
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
  return {
    contents: merged.endsWith("\n") ? merged : merged + "\n",
    replaced: true,
  };
}

export function renderConfig(
  client: McpClient,
  opts: { pat: boolean; mcpUrl: string; existing: string | null },
): RenderedConfig {
  const format = configFormat(client);
  const { contents, replaced } =
    format === "toml"
      ? mergeToml(opts.pat, opts.mcpUrl, opts.existing)
      : mergeJson(client, opts.pat, opts.mcpUrl, opts.existing);
  return { path: configPath(client), format, contents, replaced };
}

/** The two raw entry shapes printed by `--client generic`. */
export function genericSnippets(mcpUrl: string): {
  oauth: string;
  stdio: string;
  pat: string;
} {
  const stdio = {
    mcpServers: { [SERVER_NAME]: { command: STDIO_COMMAND, args: STDIO_ARGS } },
  };
  const pat = {
    mcpServers: {
      [SERVER_NAME]: {
        url: mcpUrl,
        headers: { Authorization: `Bearer ${PAT_PLACEHOLDER}` },
      },
    },
  };
  return {
    oauth: JSON.stringify(
      { mcpServers: { [SERVER_NAME]: { url: mcpUrl } } },
      null,
      2,
    ),
    stdio: JSON.stringify(stdio, null, 2),
    pat: JSON.stringify(pat, null, 2),
  };
}
