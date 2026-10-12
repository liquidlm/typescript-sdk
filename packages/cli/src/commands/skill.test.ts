import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMcpUrl: vi.fn(() => "https://mcp.example.com/v1/mcp"),
}));

vi.mock("../config.js", () => ({
  getMcpUrl: mocks.getMcpUrl,
}));

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
});
