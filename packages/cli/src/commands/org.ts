import { Command } from "commander";
import { apiClient } from "../client.js";
import {
  isLoggedIn,
  getActiveOrgId,
  getActiveOrgName,
  setActiveOrg,
} from "../auth.js";
import { formatTable } from "../format.js";

interface OrgSummary {
  id: string;
  name: string;
  is_default?: boolean;
  role?: string;
}

/**
 * Match an org by exact id, else by case-insensitive exact name. Returns null
 * when nothing matches or a name is ambiguous. Pure — unit-tested.
 */
export function resolveOrg(
  orgs: OrgSummary[],
  idOrName: string,
): OrgSummary | null {
  const needle = idOrName.trim();
  const byId = orgs.find((o) => o.id === needle);
  if (byId) return byId;
  const lower = needle.toLowerCase();
  const byName = orgs.filter((o) => o.name.toLowerCase() === lower);
  return byName.length === 1 ? byName[0]! : null;
}

function requireLogin(): void {
  if (!isLoggedIn()) {
    console.log("Not logged in. Run `liquidlm login` first.");
    process.exit(1);
  }
}

async function fetchOrgs(): Promise<OrgSummary[]> {
  const res = await apiClient.get<OrgSummary[]>("/account/organizations");
  if (!res.ok || !Array.isArray(res.data)) {
    console.error("Could not list organizations.");
    process.exit(1);
  }
  return res.data;
}

export function registerOrgCommands(program: Command): void {
  const org = program
    .command("org")
    .description("Manage the active organization");

  org
    .command("list")
    .description("List organizations you belong to (active marked with *)")
    .action(async () => {
      requireLogin();
      const orgs = await fetchOrgs();
      if (orgs.length === 0) {
        console.log("You are not a member of any organization.");
        return;
      }
      const activeId = getActiveOrgId();
      console.log(
        formatTable(
          orgs.map((o) => ({
            active: o.id === activeId ? "*" : "",
            name: o.name,
            role: o.role ?? "",
            id: o.id,
          })),
        ),
      );
    });

  org
    .command("use <org>")
    .description("Set the active organization by id or name")
    .action(async (idOrName: string) => {
      requireLogin();
      const orgs = await fetchOrgs();
      const match = resolveOrg(orgs, idOrName);
      if (!match) {
        console.error(
          `No organization matches "${idOrName}". Run \`liquidlm org list\` to see your orgs.`,
        );
        process.exit(1);
      }
      setActiveOrg(match.id, match.name);
      console.log(`Active organization set to ${match.name} (${match.id}).`);
    });

  org
    .command("show")
    .description("Show the current active organization")
    .action(() => {
      requireLogin();
      const id = getActiveOrgId();
      if (!id) {
        console.log(
          "No active organization set. Run `liquidlm org use <org>`.",
        );
        return;
      }
      const name = getActiveOrgName();
      console.log(name ? `${name} (${id})` : id);
    });
}
