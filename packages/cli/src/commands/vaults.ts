import { Command } from "commander";
import { resolve, basename } from "node:path";
import type { Vault } from "@liquidlm/sdk";
import { apiClient } from "../client.js";
import { formatTable } from "../format.js";
import { resolveVaultId } from "../resolve-vault.js";

export function registerVaultsCommands(program: Command): void {
  const vaults = program
    .command("vaults")
    .alias("dirs")
    .description("Manage vaults");

  vaults
    .command("list")
    .description("List all vaults")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const res = await apiClient.get<Vault[]>("/vaults");
      if (!res.ok || !res.data) {
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
        return;
      }

      if (res.data.length === 0) {
        console.log("No vaults configured.");
        return;
      }

      const rows = res.data.map((d) => ({
        ID: d.id,
        Label: d.label,
      }));
      console.log(formatTable(rows));
    });

  vaults
    .command("add <path>")
    .description("Create a vault from a local path")
    .option("--label <name>", "Label for the vault (defaults to folder name)")
    .action(async (rawPath: string, opts) => {
      const absolutePath = resolve(rawPath);
      const label = opts.label ?? basename(absolutePath);

      const res = await apiClient.post<Vault>("/vaults", { label });
      if (!res.ok || !res.data) {
        if (res.status === 409) {
          console.error(`A vault with that name already exists: "${label}"`);
        }
        process.exit(1);
      }
      console.log(`Vault added: ${res.data.id} (${res.data.label})`);
      console.log(`Created from path: ${absolutePath}`);
    });

  vaults
    .command("remove <id>")
    .description("Remove a vault")
    .action(async (idOrLabel: string) => {
      const id = await resolveVaultId(idOrLabel);
      const res = await apiClient.delete(`/vaults/${id}`);
      if (!res.ok) {
        process.exit(1);
      }
      console.log(`Vault ${id} removed.`);
    });
}
