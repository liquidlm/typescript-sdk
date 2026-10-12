import type { Vault } from "@liquidlm/sdk";
import { apiClient } from "./client.js";
import { debug } from "./debug.js";

/**
 * Resolve a vault by ID or label. If the input isn't a UUID,
 * fetch all vaults and find one matching by label.
 */
export async function resolveVaultId(idOrLabel: string): Promise<string> {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(idOrLabel)) {
    debug(`Resolved vault ID directly: ${idOrLabel}`);
    return idOrLabel;
  }

  const res = await apiClient.get<Vault[]>("/vaults");
  if (!res.ok || !res.data) {
    console.error("Failed to fetch vaults.");
    process.exit(1);
  }

  const match = res.data.find(
    (d) => d.label.toLowerCase() === idOrLabel.toLowerCase(),
  );
  if (!match) {
    debug(
      `No match for label "${idOrLabel}" in ${res.data.length} vaults: ${res.data.map((d) => d.label).join(", ")}`,
    );
    console.error(
      `Vault not found: "${idOrLabel}". Use \`liquidlm vaults list\` to see available vaults.`,
    );
    process.exit(1);
  }

  debug(`Resolved label "${idOrLabel}" → ${match.id}`);
  return match.id;
}
