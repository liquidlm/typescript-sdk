import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMcpUrl: vi.fn(() => "https://mcp.example.com/v1/mcp"),
  runMcpInstall: vi.fn(),
}));

vi.mock("../config.js", () => ({
  getMcpUrl: mocks.getMcpUrl,
}));

vi.mock("./mcp.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mcp.js")>();
  return { ...actual, runMcpInstall: mocks.runMcpInstall };
});

import { buildSkillFile, registerSkillCommand } from "./skill.js";

function createProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerSkillCommand(program);
  return program;
}

describe("skill command", () => {
  beforeEach(() => {
    mocks.getMcpUrl.mockReturnValue("https://mcp.example.com/v1/mcp");
  });

  afterEach(() => vi.restoreAllMocks());

  it("builds LiquidLM.md from the shared template", () => {
    const out = buildSkillFile("https://mcp.example.com/v1/mcp");

    expect(out).toContain("# LiquidLM MCP Skill");
    expect(out).toContain("MCP endpoint: `https://mcp.example.com/v1/mcp`");
    expect(out).toContain("search_knowledge");
    expect(out).toContain("liquidlm mcp install");
    expect(out).not.toContain("liquidlm mcp serve");
    expect(out).not.toContain("{{MCP_ENDPOINT}}");
  });

  it("writes to --out", async () => {
    const dir = mkdtempSync(join(tmpdir(), "liquidlm-skill-"));
    const outPath = join(dir, "LiquidLM.md");
    vi.spyOn(console, "log").mockImplementation(() => {});

    await createProgram().parseAsync([
      "node",
      "liquidlm",
      "skill",
      "--out",
      outPath,
    ]);

    const contents = readFileSync(outPath, "utf8");
    expect(contents).toContain("# LiquidLM MCP Skill");
    expect(contents).toContain(
      "MCP endpoint: `https://mcp.example.com/v1/mcp`",
    );
  });

  it("prints to stdout with --out -", async () => {
    const out = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    await createProgram().parseAsync([
      "node",
      "liquidlm",
      "skill",
      "--out",
      "-",
    ]);

    expect(out).toHaveBeenCalledWith(
      expect.stringContaining("# LiquidLM MCP Skill"),
    );
  });

  it("--with-mcp chains the client's MCP config install", async () => {
    const { runMcpInstall } = await import("./mcp.js");
    const dir = mkdtempSync(join(tmpdir(), "liquidlm-skill-mcp-"));
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      await createProgram().parseAsync([
        "node",
        "liquidlm",
        "skill",
        "--client",
        "opencode",
        "--with-mcp",
      ]);
    } finally {
      process.chdir(cwd);
    }
    expect(runMcpInstall).toHaveBeenCalledWith({ client: "opencode" });
    expect(readFileSync(join(dir, "AGENTS.md"), "utf8")).toContain(
      "liquidlm:begin",
    );
  });

  it("rejects an unsupported client with the full list", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    await expect(
      createProgram().parseAsync([
        "node",
        "liquidlm",
        "skill",
        "--client",
        "emacs",
      ]),
    ).rejects.toThrow();
    expect(err).toHaveBeenCalledWith(expect.stringContaining("claude-code"));
    exit.mockRestore();
  });
});
