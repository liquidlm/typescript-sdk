import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMcpUrl: vi.fn(() => "https://mcp.example.com/v1/mcp"),
}));

vi.mock("../config.js", () => ({
  getMcpUrl: mocks.getMcpUrl,
  getApiUrl: vi.fn(() => "https://api.example.com"),
}));

import { registerMcpCommands } from "./mcp.js";

function createProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerMcpCommands(program);
  return program;
}

let home: string;
let savedHome: string | undefined;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "liquidlm-mcp-home-"));
  savedHome = process.env.HOME;
  process.env.HOME = home;
});
afterEach(() => {
  if (savedHome === undefined) delete process.env.HOME;
  else process.env.HOME = savedHome;
  rmSync(home, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("mcp install --with-skill", () => {
  it("writes the client MCP config and the conventions block in one command", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const cwd = mkdtempSync(join(tmpdir(), "liquidlm-mcp-cwd-"));
    const prev = process.cwd();
    process.chdir(cwd);
    try {
      await createProgram().parseAsync([
        "node",
        "liquidlm",
        "mcp",
        "install",
        "--client",
        "opencode",
        "--with-skill",
      ]);
    } finally {
      process.chdir(prev);
    }
    const config = JSON.parse(
      readFileSync(join(home, ".config", "opencode", "opencode.json"), "utf8"),
    );
    expect(JSON.stringify(config)).toContain("liquidlm");
    const agents = readFileSync(join(cwd, "AGENTS.md"), "utf8");
    expect(agents).toContain("liquidlm:begin");
    expect(agents).toContain("https://mcp.example.com/v1/mcp");
  });

  it("--dry-run prints both actions without writing anything", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const cwd = mkdtempSync(join(tmpdir(), "liquidlm-mcp-dry-"));
    const prev = process.cwd();
    process.chdir(cwd);
    try {
      await createProgram().parseAsync([
        "node",
        "liquidlm",
        "mcp",
        "install",
        "--client",
        "opencode",
        "--with-skill",
        "--dry-run",
      ]);
    } finally {
      process.chdir(prev);
    }
    const out = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(out).toContain("Would write");
    expect(out).toContain("liquidlm skill --client opencode");
    expect(() => readFileSync(join(cwd, "AGENTS.md"), "utf8")).toThrow();
  });

  it("--with-skill on claude-desktop notes the app-settings boundary", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await createProgram().parseAsync([
      "node",
      "liquidlm",
      "mcp",
      "install",
      "--client",
      "claude-desktop",
      "--with-skill",
    ]);
    const out = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(out).toContain("app settings");
  });
});
