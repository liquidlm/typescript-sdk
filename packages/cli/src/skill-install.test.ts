import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  InstallRefusal,
  installSkill,
  renderConventions,
} from "./skill-install.js";

const ENDPOINT = "https://mcp.example.test/v1/mcp";
let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "liquidlm-skill-install-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const read = (rel: string) => readFileSync(join(dir, rel), "utf8");

describe("renderConventions", () => {
  it("substitutes the endpoint and keeps the canonical body", () => {
    const out = renderConventions("generic", ENDPOINT);
    expect(out).toContain(`MCP endpoint: \`${ENDPOINT}\``);
    expect(out).not.toContain("{{MCP_ENDPOINT}}");
    expect(out).toContain("# LiquidLM MCP Skill");
  });
});

describe("installSkill", () => {
  it("installs into an empty project and is idempotent on repeat", () => {
    const first = installSkill({ client: "codex", endpoint: ENDPOINT, dir });
    expect(first.action).toBe("installed");
    expect(read("AGENTS.md")).toMatch(/liquidlm:begin sha256:[0-9a-f]{64}/);
    expect(read("AGENTS.md")).toContain("Search first");
    const second = installSkill({ client: "codex", endpoint: ENDPOINT, dir });
    expect(second.action).toBe("up-to-date");
  });

  it("appends a managed section without touching existing content", () => {
    writeFileSync(
      join(dir, "CLAUDE.md"),
      "# My project\n\nExisting instructions stay.\n",
    );
    const result = installSkill({
      client: "claude-code",
      endpoint: ENDPOINT,
      dir,
    });
    expect(result.action).toBe("appended");
    const content = read("CLAUDE.md");
    expect(
      content.startsWith("# My project\n\nExisting instructions stay.\n"),
    ).toBe(true);
    expect(existsSync(join(dir, "CLAUDE.md.liquidlm.bak"))).toBe(true);
  });

  it("updates a clean older block in place", () => {
    installSkill({ client: "codex", endpoint: ENDPOINT, dir });
    const older = read("AGENTS.md").replace(
      "Search first.",
      "Search first (older wording).",
    );
    const inner = older.match(
      /<!-- liquidlm:begin sha256:[0-9a-f]{64} -->\n([\s\S]*?)\n<!-- liquidlm:end -->/,
    )![1];
    const rehashed = older.replace(
      /sha256:[0-9a-f]{64}/,
      `sha256:${createHash("sha256").update(inner).digest("hex")}`,
    );
    writeFileSync(join(dir, "AGENTS.md"), rehashed);
    const result = installSkill({ client: "codex", endpoint: ENDPOINT, dir });
    expect(result.action).toBe("updated");
    expect(read("AGENTS.md")).toContain("Search first.");
  });

  it("refuses to replace a hand-edited block without --force", () => {
    installSkill({ client: "claude-code", endpoint: ENDPOINT, dir });
    writeFileSync(
      join(dir, "CLAUDE.md"),
      read("CLAUDE.md").replace("Search first.", "User custom instruction."),
    );
    expect(() =>
      installSkill({ client: "claude-code", endpoint: ENDPOINT, dir }),
    ).toThrow(InstallRefusal);
    const forced = installSkill({
      client: "claude-code",
      endpoint: ENDPOINT,
      dir,
      force: true,
    });
    expect(forced.action).toBe("updated");
  });

  it("uninstall removes the block and keeps other content", () => {
    writeFileSync(join(dir, "AGENTS.md"), "# Pre-existing\n");
    installSkill({ client: "codex", endpoint: ENDPOINT, dir });
    const result = installSkill({
      client: "codex",
      endpoint: ENDPOINT,
      dir,
      uninstall: true,
    });
    expect(result.action).toBe("removed");
    expect(read("AGENTS.md")).toBe("# Pre-existing\n");
  });

  it("owned-file client creates and deletes its own file", () => {
    installSkill({ client: "generic", endpoint: ENDPOINT, dir });
    expect(read("LIQUIDLM.md")).toContain("# LiquidLM MCP Skill");
    const result = installSkill({
      client: "generic",
      endpoint: ENDPOINT,
      dir,
      uninstall: true,
    });
    expect(result.action).toBe("removed");
    expect(existsSync(join(dir, "LIQUIDLM.md"))).toBe(false);
    expect(existsSync(join(dir, "LIQUIDLM.md.liquidlm.bak"))).toBe(true);
  });

  it("owned-file client refuses a foreign file without --force", () => {
    writeFileSync(join(dir, "LIQUIDLM.md"), "Someone else's file\n");
    expect(() =>
      installSkill({ client: "generic", endpoint: ENDPOINT, dir }),
    ).toThrow(/without a LiquidLM managed block/);
    expect(read("LIQUIDLM.md")).toBe("Someone else's file\n");
    installSkill({ client: "generic", endpoint: ENDPOINT, dir, force: true });
    expect(read("LIQUIDLM.md.liquidlm.bak")).toBe("Someone else's file\n");
  });

  it("cursor writes frontmatter plus a managed block under .cursor/rules", () => {
    installSkill({ client: "cursor", endpoint: ENDPOINT, dir });
    const content = read(".cursor/rules/liquidlm.mdc");
    expect(content.startsWith("---\ndescription:")).toBe(true);
    expect(content).toContain("alwaysApply: true");
    expect(content).toMatch(/liquidlm:begin sha256:/);
    installSkill({
      client: "cursor",
      endpoint: ENDPOINT,
      dir,
      uninstall: true,
    });
    expect(existsSync(join(dir, ".cursor/rules/liquidlm.mdc"))).toBe(false);
  });

  it("produces byte-identical output to the skills-repo installer", () => {
    // Cross-implementation parity guard: the canonical fixture hash is also
    // asserted by opensource/skills/tests/install.test.mjs. If either side
    // changes the managed-block format, one of the two suites fails.
    installSkill({ client: "opencode", endpoint: ENDPOINT, dir });
    const digest = createHash("sha256").update(read("AGENTS.md")).digest("hex");
    expect(digest).toBe(
      "05139399b4536ffd4b720c4477a9cfd467d5758ac0f3ce1964480d4dbe9756bd",
    );
  });

  it("codex and opencode share AGENTS.md idempotently", () => {
    installSkill({ client: "codex", endpoint: ENDPOINT, dir });
    const second = installSkill({
      client: "opencode",
      endpoint: ENDPOINT,
      dir,
    });
    expect(second.action).toBe("up-to-date");
  });

  it("uninstall of a hand-edited block requires --force", () => {
    installSkill({ client: "codex", endpoint: ENDPOINT, dir });
    writeFileSync(
      join(dir, "AGENTS.md"),
      read("AGENTS.md").replace("Search first.", "Edited."),
    );
    expect(() =>
      installSkill({
        client: "codex",
        endpoint: ENDPOINT,
        dir,
        uninstall: true,
      }),
    ).toThrow(/edited by hand/);
    installSkill({
      client: "codex",
      endpoint: ENDPOINT,
      dir,
      uninstall: true,
      force: true,
    });
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(false);
  });
});
