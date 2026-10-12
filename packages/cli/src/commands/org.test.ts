import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  isLoggedIn: vi.fn(() => true),
  getActiveOrgId: vi.fn(() => null as string | null),
  getActiveOrgName: vi.fn(() => undefined as string | undefined),
  setActiveOrg: vi.fn(),
}));

vi.mock("../client.js", () => ({ apiClient: { get: mocks.get } }));
vi.mock("../auth.js", () => ({
  isLoggedIn: mocks.isLoggedIn,
  getActiveOrgId: mocks.getActiveOrgId,
  getActiveOrgName: mocks.getActiveOrgName,
  setActiveOrg: mocks.setActiveOrg,
}));

import { registerOrgCommands, resolveOrg } from "./org.js";

function createProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerOrgCommands(program);
  return program;
}

describe("resolveOrg", () => {
  const orgs = [
    { id: "org-acme", name: "Acme" },
    { id: "org-beta", name: "Beta" },
    { id: "org-beta2", name: "Beta" },
  ];

  it("matches by exact id", () => {
    expect(resolveOrg(orgs, "org-beta")?.id).toBe("org-beta");
  });

  it("matches by case-insensitive name", () => {
    expect(resolveOrg(orgs.slice(0, 2), "acme")?.id).toBe("org-acme");
  });

  it("returns null for no match", () => {
    expect(resolveOrg(orgs, "nope")).toBeNull();
  });

  it("returns null for an ambiguous name", () => {
    expect(resolveOrg(orgs, "beta")).toBeNull();
  });
});

describe("org commands", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.setActiveOrg.mockReset();
    mocks.isLoggedIn.mockReturnValue(true);
    mocks.getActiveOrgId.mockReturnValue(null);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("org list requests /account/organizations", async () => {
    mocks.get.mockResolvedValueOnce({
      ok: true,
      data: [{ id: "org-acme", name: "Acme", role: "owner" }],
    });
    await createProgram().parseAsync(["node", "liquidlm", "org", "list"]);
    expect(mocks.get).toHaveBeenCalledWith("/account/organizations");
  });

  it("org use sets the active org by name", async () => {
    mocks.get.mockResolvedValueOnce({
      ok: true,
      data: [{ id: "org-acme", name: "Acme", role: "owner" }],
    });
    await createProgram().parseAsync([
      "node",
      "liquidlm",
      "org",
      "use",
      "Acme",
    ]);
    expect(mocks.setActiveOrg).toHaveBeenCalledWith("org-acme", "Acme");
  });
});
