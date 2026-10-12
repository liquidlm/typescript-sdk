import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Command } from "commander";
import { SKILL_TEMPLATE } from "../generated/skill-template.js";
import { getMcpUrl } from "../config.js";
import {
  InstallRefusal,
  SKILL_CLIENTS,
  installSkill,
  type SkillClient,
} from "../skill-install.js";

export function buildSkillFile(mcpEndpoint = getMcpUrl()): string {
  const endpoint = mcpEndpoint.trim() || "<your-mcp-url>";
  return SKILL_TEMPLATE.replaceAll("{{MCP_ENDPOINT}}", endpoint);
}

export function registerSkillCommand(program: Command): void {
  program
    .command("skill")
    .description("Write LiquidLM.md agent instructions for this project")
    .option("--client <client>", SKILL_CLIENTS.join(" | "), "generic")
    .option("--out <path>", "Output path, or '-' to print without installing")
    .option("--uninstall", "Remove the managed conventions block/file", false)
    .option("--force", "Replace managed content that was edited by hand", false)
    .action(
      (opts: {
        client?: string;
        out?: string;
        uninstall?: boolean;
        force?: boolean;
      }) => {
        const client = (opts.client ?? "generic") as SkillClient;
        if (!SKILL_CLIENTS.includes(client)) {
          console.error(
            `Unsupported client. Use "--client ${SKILL_CLIENTS.join('" or "--client')}".`,
          );
          process.exit(1);
        }

        const endpoint = getMcpUrl();

        // Explicit output path: whole-file write, no managed block (legacy
        // behavior for piping the conventions somewhere unusual).
        if (opts.out) {
          const content = buildSkillFile(endpoint);
          if (opts.out === "-") {
            process.stdout.write(content);
            if (!content.endsWith("\n")) process.stdout.write("\n");
            return;
          }
          mkdirSync(dirname(opts.out), { recursive: true });
          writeFileSync(opts.out, content, "utf8");
          console.log(`Wrote ${opts.out}`);
          return;
        }

        try {
          const result = installSkill({
            client,
            endpoint,
            uninstall: opts.uninstall,
            force: opts.force,
          });
          console.log(result.message);
        } catch (err) {
          if (err instanceof InstallRefusal) {
            console.error(err.message);
            process.exit(1);
          }
          throw err;
        }
      },
    );
}
