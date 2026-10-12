import { Command } from "commander";
import { apiClient } from "../client.js";
import { isLoggedIn } from "../auth.js";

interface AccountSelf {
  id: string;
  email: string | null;
  bearerClass: "session" | "pat";
  activeOrgId: string | null;
  scopeBundle: string | null;
  expandedScopes: { api: string[]; mcp: string[] };
}

interface OrgSummary {
  id: string;
  name: string;
  role?: string;
}

interface VaultRow {
  id: string;
  label: string;
}

function scopeLine(scopes: string[]): string {
  return scopes.length ? scopes.join(", ") : "(none)";
}

export function registerWhoamiCommand(program: Command): void {
  program
    .command("whoami")
    .description("Show the current identity, active org, and expanded scopes")
    .action(async () => {
      if (!isLoggedIn()) {
        console.log("Not logged in. Run `liquidlm login` first.");
        process.exit(1);
      }

      const meRes = await apiClient.get<AccountSelf>("/auth/me");
      if (!meRes.ok || !meRes.data) {
        console.error("Could not retrieve identity.");
        process.exit(1);
      }
      const me = meRes.data;

      console.log(`User:    ${me.email ?? me.id} (${me.id})`);
      console.log(`Bearer:  ${me.bearerClass}`);

      // Resolve the active org's name + role (best-effort; identity already worked).
      let orgLine = me.activeOrgId ?? "(none)";
      if (me.activeOrgId) {
        const orgsRes = await apiClient.get<OrgSummary[]>(
          "/account/organizations",
        );
        const match = Array.isArray(orgsRes.data)
          ? orgsRes.data.find((o) => o.id === me.activeOrgId)
          : undefined;
        if (match) {
          orgLine = `${match.name} (${match.id})${match.role ? ` — ${match.role}` : ""}`;
        }
      }
      console.log(`Org:     ${orgLine}`);
      if (me.scopeBundle) console.log(`Bundle:  ${me.scopeBundle}`);
      console.log(`Scopes (api): ${scopeLine(me.expandedScopes.api)}`);
      console.log(`Scopes (mcp): ${scopeLine(me.expandedScopes.mcp)}`);

      // Vaults the bearer can see (best-effort).
      const vaultsRes = await apiClient.get<VaultRow[]>("/vaults");
      if (
        vaultsRes.ok &&
        Array.isArray(vaultsRes.data) &&
        vaultsRes.data.length > 0
      ) {
        console.log("Vaults:");
        for (const v of vaultsRes.data) {
          console.log(`  - ${v.label} (${v.id})`);
        }
      }
    });
}
