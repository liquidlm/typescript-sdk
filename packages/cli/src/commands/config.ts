import { Command } from "commander";
import {
  CONFIG_FILE,
  DEFAULT_API_URL,
  DEFAULT_MCP_URL,
  getApiUrl,
  getConfig,
  getMcpUrl,
  setConfig,
} from "../config.js";

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function source(override: string | undefined, envVar: string): string {
  if (override) return "config.json";
  if (process.env[envVar]) return `$${envVar}`;
  return "default";
}

function printConfig(): void {
  const config = getConfig();
  console.log(
    `API endpoint: ${getApiUrl()}  (${source(config.apiUrl, "LIQUIDLM_API_URL")})`,
  );
  console.log(
    `MCP endpoint: ${getMcpUrl()}  (${source(config.mcpUrl, "LIQUIDLM_MCP_URL")})`,
  );
  console.log(`\nDefaults: ${DEFAULT_API_URL} / ${DEFAULT_MCP_URL}`);
  console.log(`Stored at: ${CONFIG_FILE}`);
}

export function registerConfigCommands(program: Command): void {
  const config = program
    .command("config")
    .description(
      "Show or override the API / MCP endpoints (optional — defaults to production)",
    );

  config
    .command("show", { isDefault: true })
    .description("Print the resolved endpoints and where each value comes from")
    .action(() => {
      printConfig();
    });

  config
    .command("set")
    .description("Persist an endpoint override to ~/.liquidlm/config.json")
    .option("--api-url <url>", "Override the REST API endpoint")
    .option("--mcp-url <url>", "Override the MCP endpoint")
    .action((opts: { apiUrl?: string; mcpUrl?: string }) => {
      if (!opts.apiUrl && !opts.mcpUrl) {
        console.error("Nothing to set. Pass --api-url and/or --mcp-url.");
        process.exit(1);
      }
      const updates: { apiUrl?: string; mcpUrl?: string } = {};
      if (opts.apiUrl) {
        if (!isValidUrl(opts.apiUrl)) {
          console.error(`Invalid --api-url: ${opts.apiUrl}`);
          process.exit(1);
        }
        updates.apiUrl = opts.apiUrl;
      }
      if (opts.mcpUrl) {
        if (!isValidUrl(opts.mcpUrl)) {
          console.error(`Invalid --mcp-url: ${opts.mcpUrl}`);
          process.exit(1);
        }
        updates.mcpUrl = opts.mcpUrl;
      }
      setConfig(updates);
      printConfig();
    });

  config
    .command("reset")
    .description(
      "Clear endpoint overrides and fall back to the production defaults",
    )
    .action(() => {
      setConfig({ apiUrl: undefined, mcpUrl: undefined });
      printConfig();
    });
}
