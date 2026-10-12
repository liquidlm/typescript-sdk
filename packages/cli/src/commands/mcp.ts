import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Command } from "commander";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { CLI_NAME, CLI_VERSION } from "../branding.js";
import { getMcpUrl } from "../config.js";
import {
  getToken,
  getActiveOrgId,
  getEnvironmentToken,
  isLoggedIn,
} from "../auth.js";
import {
  MCP_CLIENTS,
  configPath,
  genericSnippets,
  isMcpClient,
  renderConfig,
  supportsPat,
  usesRemoteOauth,
} from "../mcp-config.js";
import {
  SKILL_CLIENTS,
  installSkill,
  type SkillClient,
} from "../skill-install.js";

function withSkill(client: string, mcpUrl: string, dryRun?: boolean): void {
  if (dryRun) {
    console.log(
      `\n# Would also install the conventions block: liquidlm skill --client ${client}`,
    );
    return;
  }
  if (!(SKILL_CLIENTS as readonly string[]).includes(client)) {
    console.log(
      `\n--with-skill: ${client} reads assistant instructions from its own app settings; nothing installed. Use \`liquidlm skill --client generic\` for a standalone LIQUIDLM.md.`,
    );
    return;
  }
  const result = installSkill({
    client: client as SkillClient,
    endpoint: mcpUrl,
  });
  console.log(`Conventions: ${result.message}`);
}

export function runMcpInstall(opts: {
  client?: string;
  pat?: boolean;
  dryRun?: boolean;
  withSkill?: boolean;
}): void {
  const client = opts.client;
  if (!client) {
    console.error(
      `--client is required. One of: ${[...MCP_CLIENTS, "generic"].join(", ")}.`,
    );
    process.exit(1);
  }

  const mcpUrl = getMcpUrl();

  if (client === "generic") {
    const { oauth, stdio, pat } = genericSnippets(mcpUrl);
    console.log(
      "# 1. Native OAuth (default): configure the URL, then authorize in your client.\n",
    );
    console.log(oauth);
    console.log("# 2. CLI-managed OAuth: liquidlm login, then use stdio:\n");
    console.log(stdio);
    console.log(
      "\n# 3. PAT (last fallback): inject $LIQUIDLM_API_TOKEN. Environment substitution syntax depends on your client:\n",
    );
    console.log(pat);
    if (opts.withSkill) withSkill(client, mcpUrl, opts.dryRun);
    return;
  }

  if (!isMcpClient(client)) {
    console.error(
      `Unknown client "${client}". One of: ${[...MCP_CLIENTS, "generic"].join(", ")}.`,
    );
    process.exit(1);
  }

  if (opts.pat && !supportsPat(client)) {
    console.error(
      `${client} only supports stdio servers in its config file — omit --pat ` +
        "(the CLI-managed stdio proxy), or add a remote connector in the app's own settings.",
    );
    process.exit(1);
  }

  const path = configPath(client);
  const existing = existsSync(path) ? readFileSync(path, "utf-8") : null;
  const rendered = renderConfig(client, {
    pat: Boolean(opts.pat),
    mcpUrl,
    existing,
  });

  if (opts.dryRun) {
    console.log(
      `# ${rendered.replaced ? "Would update" : "Would write"} ${rendered.path}\n`,
    );
    console.log(rendered.contents.trimEnd());
    if (opts.withSkill) withSkill(client, mcpUrl, true);
    return;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, rendered.contents, "utf-8");

  console.log(
    `${rendered.replaced ? "Updated" : "Wrote"} ${client} MCP config at ${path}.`,
  );
  if (opts.pat) {
    console.log(
      "Transport: direct HTTP (Path B). Set LIQUIDLM_API_TOKEN in the client's environment.",
    );
  } else if (usesRemoteOauth(client)) {
    console.log(
      "Transport: remote HTTP. Cursor holds OAuth — no token stored in the config.",
    );
    console.log(
      "Next: run `agent mcp login liquidlm` (Cursor CLI) or click Connect in Settings → MCP.",
    );
  } else {
    console.log(
      "Transport: a local stdio proxy (`liquidlm mcp serve`) that forwards to the hosted " +
        "MCP server using your refreshed CLI session — no token stored in the config.",
    );
  }
  console.log(
    "Most clients pick up the new server live; restart the client if it doesn't appear.",
  );
  if (opts.withSkill) withSkill(client, mcpUrl, opts.dryRun);
}

const LOGIN_HINT =
  "Not signed in to LiquidLM (or the session expired). Run `liquidlm login` " +
  "in any terminal, then retry this tool — the MCP server stays running, no " +
  "client restart is needed.";

/** The slice of the SDK Client the proxy uses — lets tests inject a fake. */
export type RemoteMcp = Pick<Client, "listTools" | "callTool" | "close">;

/**
 * Lazy, self-healing proxy handlers. The remote connection is established on
 * the FIRST tool request (never at startup) and dropped on any transport-level
 * failure so the next request reconnects with a fresh session. Auth problems
 * surface as request errors carrying remediation text — the MCP client's agent
 * relays them to the user — instead of killing the process, which left the
 * server in a permanent "error state" in the client (Cursor validation,
 * 2026-07-13) until a full client restart.
 */
export function createProxyHandlers(deps: {
  isLoggedIn: () => boolean;
  connect: () => Promise<RemoteMcp>;
}): {
  listTools: () => ReturnType<RemoteMcp["listTools"]>;
  callTool: (
    params: Parameters<RemoteMcp["callTool"]>[0],
  ) => ReturnType<RemoteMcp["callTool"]>;
} {
  let remote: Promise<RemoteMcp> | null = null;

  function acquire(): Promise<RemoteMcp> {
    if (!deps.isLoggedIn()) {
      return Promise.reject(new Error(LOGIN_HINT));
    }
    remote ??= deps.connect().catch((err: unknown) => {
      remote = null;
      throw new Error(
        `Could not reach the LiquidLM MCP server: ${
          err instanceof Error ? err.message : String(err)
        }. If this mentions authentication, run \`liquidlm login\` and retry; ` +
          "or set LIQUIDLM_API_TOKEN to a valid PAT. Otherwise check your network, then retry. " +
          "The server stays running; authentication failures require fresh credentials before retrying.",
      );
    });
    return remote;
  }

  async function proxied<T>(fn: (r: RemoteMcp) => Promise<T>): Promise<T> {
    const r = await acquire();
    try {
      return await fn(r);
    } catch (err) {
      // Tool-level failures come back as `isError` content, not exceptions —
      // a throw here means the transport/session broke. Drop the connection so
      // the next request reconnects (e.g. right after a fresh login).
      remote = null;
      void r.close().catch(() => undefined);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  return {
    listTools: () => proxied((r) => r.listTools()),
    callTool: (params) => proxied((r) => r.callTool(params)),
  };
}

/**
 * stdio MCP transport that proxies tool calls to the remote `/v1/mcp`. Each
 * outbound request gets a freshly-refreshed bearer (and the active-org header)
 * so the JWT never lives in a client config file. All diagnostics go to stderr —
 * stdout is the MCP protocol channel. The process NEVER exits on auth/connect
 * problems: it stays up and reports them per-request (see createProxyHandlers).
 */
async function runServe(): Promise<void> {
  const mcpUrl = new URL(getMcpUrl());

  const proxyFetch = (async (
    input: string | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const token = await getToken();
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    // PAT scope owns its org; an unrelated saved login must not override it.
    const orgId = getEnvironmentToken() ? null : getActiveOrgId();
    if (orgId) headers.set("X-LiquidLM-Active-Org", orgId);
    return fetch(input, { ...init, headers });
  }) as unknown as typeof fetch;

  const connect = async (): Promise<RemoteMcp> => {
    const client = new Client(
      { name: `${CLI_NAME}-cli-proxy`, version: CLI_VERSION },
      { capabilities: {} },
    );
    await client.connect(
      new StreamableHTTPClientTransport(mcpUrl, { fetch: proxyFetch }),
    );
    return client;
  };

  const handlers = createProxyHandlers({ isLoggedIn, connect });

  const local = new Server(
    { name: CLI_NAME, version: CLI_VERSION },
    { capabilities: { tools: {} } },
  );

  local.setRequestHandler(ListToolsRequestSchema, () => handlers.listTools());
  local.setRequestHandler(CallToolRequestSchema, (req) =>
    handlers.callTool(req.params),
  );

  const shutdown = () => {
    void local.close().catch(() => undefined);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await local.connect(new StdioServerTransport());
  console.error(`liquidlm mcp serve: proxying to ${mcpUrl.href}`);
  if (!isLoggedIn()) {
    console.error(
      "liquidlm mcp serve: not signed in yet — tool calls will ask for `liquidlm login` until you do.",
    );
  }
}

export function registerMcpCommands(program: Command): void {
  const mcp = program
    .command("mcp")
    .description("MCP server install + stdio proxy");

  mcp
    .command("install")
    .description("Write a LiquidLM MCP server entry into a client config")
    .option(
      "--client <client>",
      `cursor | claude-code | claude-desktop | codex | opencode | generic`,
    )
    .option(
      "--pat",
      "Authenticate with a PAT ($LIQUIDLM_API_TOKEN) over direct HTTP instead of the client's default transport",
    )
    .option("--dry-run", "Print the resulting config without writing it")
    .option(
      "--with-skill",
      "Also install the LiquidLM conventions block for this client (AGENTS.md/CLAUDE.md/.cursor rules)",
    )
    .action(
      (opts: {
        client?: string;
        pat?: boolean;
        dryRun?: boolean;
        withSkill?: boolean;
      }) => {
        runMcpInstall(opts);
      },
    );

  mcp
    .command("serve")
    .description(
      "Run a stdio MCP proxy to the remote /v1/mcp (used by `mcp install` on stdio clients)",
    )
    .action(async () => {
      await runServe();
    });
}
