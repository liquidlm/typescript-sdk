import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  ensurePrivateDir,
  hardenPrivateFile,
  writePrivateFile,
} from "./local-secrets.js";

export const CONFIG_DIR = join(homedir(), ".liquidlm");
export const CONFIG_FILE = join(CONFIG_DIR, "config.json");
export const CREDENTIALS_FILE = join(CONFIG_DIR, "credentials.json");

export interface Config {
  apiUrl?: string;
  mcpUrl?: string;
  [key: string]: unknown;
}

function ensureConfigDir(): void {
  ensurePrivateDir(CONFIG_DIR);
  hardenPrivateFile(CONFIG_FILE);
  hardenPrivateFile(CREDENTIALS_FILE);
}

export function getConfig(): Config {
  ensureConfigDir();
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as Config;
  } catch {
    return {};
  }
}

export function setConfig(updates: Partial<Config>): void {
  ensureConfigDir();
  const current = getConfig();
  const merged = { ...current, ...updates };
  writePrivateFile(CONFIG_FILE, JSON.stringify(merged, null, 2) + "\n");
}

function withApiVersion(raw: string): string {
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

/**
 * Hosted defaults so a fresh install talks to production with no config. Local
 * dev overrides via `liquidlm config set`, `~/.liquidlm/config.json`, or the
 * `LIQUIDLM_API_URL` / `LIQUIDLM_MCP_URL` env vars (resolution: config > env > default).
 */
export const DEFAULT_API_URL = "https://api.liquidlm.com";
export const DEFAULT_MCP_URL = "https://mcp.liquidlm.com/v1/mcp";

export function getApiUrl(): string {
  const config = getConfig();
  return withApiVersion(
    config.apiUrl ?? process.env.LIQUIDLM_API_URL ?? DEFAULT_API_URL,
  );
}

/**
 * The remote MCP endpoint the stdio proxy and `mcp install` point at. Mirrors the
 * dashboard's `VITE_MCP_URL` convention (separate origin from the REST API) and
 * always normalizes to end with `/v1/mcp`.
 */
export function getMcpUrl(): string {
  const config = getConfig();
  const raw = (
    config.mcpUrl ??
    process.env.LIQUIDLM_MCP_URL ??
    DEFAULT_MCP_URL
  ).replace(/\/+$/, "");
  if (raw.endsWith("/v1/mcp")) return raw;
  if (raw.endsWith("/mcp")) return `${raw.slice(0, -"/mcp".length)}/v1/mcp`;
  return `${raw}/v1/mcp`;
}
