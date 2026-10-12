/**
 * Client conventions installer — the CLI-side port of the skills repository's
 * install.mjs. Installs, updates or removes the canonical conventions using
 * checksum-guarded managed blocks; shared files (CLAUDE.md, AGENTS.md) keep
 * unrelated content, and every change leaves a rolling `.liquidlm.bak` backup.
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { SKILL_TEMPLATE } from "./generated/skill-template.js";

export type SkillClient =
  | "generic"
  | "claude-code"
  | "codex"
  | "opencode"
  | "cursor";

export const SKILL_CLIENTS: readonly SkillClient[] = [
  "generic",
  "claude-code",
  "codex",
  "opencode",
  "cursor",
];

const TARGETS: Record<
  SkillClient,
  { path: string; mode: "owned-file" | "managed-section"; frontmatter?: string }
> = {
  generic: { path: "LIQUIDLM.md", mode: "owned-file" },
  "claude-code": { path: "CLAUDE.md", mode: "managed-section" },
  codex: { path: "AGENTS.md", mode: "managed-section" },
  opencode: { path: "AGENTS.md", mode: "managed-section" },
  cursor: {
    path: ".cursor/rules/liquidlm.mdc",
    mode: "owned-file",
    frontmatter:
      "---\ndescription: LiquidLM knowledge backend conventions (search first, cite, scoped vaults)\nalwaysApply: true\n---\n\n",
  },
};

const BEGIN = /<!-- liquidlm:begin sha256:([0-9a-f]{64}) -->/;
const END = "<!-- liquidlm:end -->";

function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function renderConventions(
  client: SkillClient,
  endpoint: string,
): string {
  return SKILL_TEMPLATE.replaceAll("{{MCP_ENDPOINT}}", endpoint);
}

function wrapBlock(body: string): string {
  return `<!-- liquidlm:begin sha256:${sha(body)} -->\n${body}\n${END}\n`;
}

type Block = {
  recordedSha: string;
  inner: string;
  start: number;
  end: number;
};

function parseBlock(content: string): Block | null {
  const begin = content.match(BEGIN);
  if (!begin || begin.index === undefined) return null;
  const endIndex = content.indexOf(END, begin.index + begin[0].length);
  if (endIndex === -1) return null;
  const innerStart = begin.index + begin[0].length + 1;
  return {
    recordedSha: begin[1],
    inner: content.slice(innerStart, endIndex - 1),
    start: begin.index,
    end: endIndex + END.length,
  };
}

export type InstallResult = {
  action:
    | "installed"
    | "up-to-date"
    | "updated"
    | "appended"
    | "removed"
    | "not-installed";
  target: string;
  backup?: string;
  message: string;
};

export class InstallRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstallRefusal";
  }
}

export function installSkill(opts: {
  client: SkillClient;
  endpoint: string;
  dir?: string;
  force?: boolean;
  uninstall?: boolean;
}): InstallResult {
  const client = TARGETS[opts.client];
  const dir = opts.dir ?? process.cwd();
  const target = resolve(dir, client.path);
  const body = renderConventions(opts.client, opts.endpoint);
  const frontmatter = client.frontmatter ?? "";
  const section = client.mode === "managed-section";

  if (!existsSync(target)) {
    if (opts.uninstall) {
      return {
        action: "not-installed",
        target,
        message: `Not installed: ${target} does not exist.`,
      };
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, frontmatter + wrapBlock(body));
    return {
      action: "installed",
      target,
      message: `Installed LiquidLM conventions into ${target}`,
    };
  }

  const existing = readFileSync(target, "utf8");
  const block = parseBlock(existing);

  if (opts.uninstall) {
    if (!block) {
      throw new InstallRefusal(
        `Refusing to uninstall: ${target} has no LiquidLM managed block; nothing was changed.`,
      );
    }
    if (sha(block.inner) !== block.recordedSha && !opts.force) {
      throw new InstallRefusal(
        `Refusing to uninstall: the managed block in ${target} was edited by hand. Re-run with --force to remove it anyway.`,
      );
    }
    const remainder = (
      existing.slice(0, block.start) + existing.slice(block.end)
    )
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const withoutWrapper = section
      ? remainder
      : remainder.replace(/^---\n[\s\S]*?\n---\n?$/, "").trim();
    copyFileSync(target, `${target}.liquidlm.bak`);
    const backup = `${target}.liquidlm.bak`;
    if (!withoutWrapper) {
      rmSync(target);
      return {
        action: "removed",
        target,
        backup,
        message: `Removed ${target} (backup: ${backup})`,
      };
    }
    writeFileSync(target, remainder + "\n");
    return {
      action: "removed",
      target,
      backup,
      message: `Removed the LiquidLM block from ${target}; other content preserved (backup: ${backup})`,
    };
  }

  const expected = wrapBlock(body);
  const expectedFile = frontmatter + expected;
  if (section) {
    if (block) {
      if (
        sha(block.inner) === sha(body) &&
        existing.includes(expected.trim())
      ) {
        return {
          action: "up-to-date",
          target,
          message: `Already up to date: ${target}`,
        };
      }
      if (sha(block.inner) !== block.recordedSha && !opts.force) {
        throw new InstallRefusal(
          `Refusing to update: the managed block in ${target} was edited by hand. Re-run with --force to replace it.`,
        );
      }
      copyFileSync(target, `${target}.liquidlm.bak`);
      writeFileSync(
        target,
        existing.slice(0, block.start) +
          expected.trimEnd() +
          "\n" +
          existing.slice(block.end),
      );
      return {
        action: "updated",
        target,
        backup: `${target}.liquidlm.bak`,
        message: `Updated the LiquidLM block in ${target} (backup: ${target}.liquidlm.bak)`,
      };
    }
    copyFileSync(target, `${target}.liquidlm.bak`);
    const separator = existing.endsWith("\n") ? "\n" : "\n\n";
    writeFileSync(target, existing + separator + expected);
    return {
      action: "appended",
      target,
      backup: `${target}.liquidlm.bak`,
      message: `Appended LiquidLM conventions to ${target}; existing content preserved (backup: ${target}.liquidlm.bak)`,
    };
  }

  if (existing === expectedFile) {
    return {
      action: "up-to-date",
      target,
      message: `Already up to date: ${target}`,
    };
  }
  if (!block) {
    if (!opts.force) {
      throw new InstallRefusal(
        `Refusing to overwrite ${target}: it exists without a LiquidLM managed block. Re-run with --force to replace it (a backup is made either way).`,
      );
    }
  } else if (sha(block.inner) !== block.recordedSha && !opts.force) {
    throw new InstallRefusal(
      `Refusing to update: the managed block in ${target} was edited by hand. Re-run with --force to replace it.`,
    );
  }
  copyFileSync(target, `${target}.liquidlm.bak`);
  writeFileSync(target, expectedFile);
  return {
    action: existing && block ? "updated" : "installed",
    target,
    backup: `${target}.liquidlm.bak`,
    message: `Wrote ${target} (backup: ${target}.liquidlm.bak)`,
  };
}
