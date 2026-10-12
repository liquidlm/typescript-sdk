import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Command } from "commander";
import { SKILL_TEMPLATE } from "../generated/skill-template.js";
import { getMcpUrl } from "../config.js";

export function buildSkillFile(mcpEndpoint = getMcpUrl()): string {
  const endpoint = mcpEndpoint.trim() || "<your-mcp-url>";
  return SKILL_TEMPLATE.replaceAll("{{MCP_ENDPOINT}}", endpoint);
}

export function registerSkillCommand(program: Command): void {
  program
    .command("skill")
    .description("Write LiquidLM.md agent instructions for this project")
    .option("--client <client>", "cursor | generic", "generic")
    .option("--out <path>", "Output path, or '-' for stdout", "LiquidLM.md")
    .action((opts: { client?: string; out?: string }) => {
      const client = opts.client ?? "generic";
      if (client !== "cursor" && client !== "generic") {
        console.error(
          'Unsupported client. Use "--client cursor" or "--client generic".',
        );
        process.exit(1);
      }

      const content = buildSkillFile();
      const out = opts.out ?? "LiquidLM.md";

      if (out === "-") {
        process.stdout.write(content);
        if (!content.endsWith("\n")) process.stdout.write("\n");
        return;
      }

      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, content, "utf8");
      console.log(`Wrote ${out}`);
    });
}
