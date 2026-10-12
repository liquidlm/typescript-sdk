import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  getCredentials: vi.fn(),
  isLoggedIn: vi.fn(() => true),
}));

vi.mock("../auth.js", () => ({
  getToken: mocks.getToken,
  getCredentials: mocks.getCredentials,
  isLoggedIn: mocks.isLoggedIn,
}));

import { registerTokenCommands } from "./token.js";

function createProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerTokenCommands(program);
  return program;
}

describe("token export", () => {
  beforeEach(() => {
    mocks.getToken.mockReset();
    mocks.getCredentials.mockReset();
    mocks.isLoggedIn.mockReturnValue(true);
  });

  afterEach(() => vi.restoreAllMocks());

  it("prints the raw token by default", async () => {
    mocks.getToken.mockResolvedValueOnce("tok-123");
    mocks.getCredentials.mockReturnValueOnce({ expires_at: 0 });
    const out = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    await createProgram().parseAsync(["node", "liquidlm", "token", "export"]);

    expect(out).toHaveBeenCalledWith("tok-123\n");
  });

  it("emits a shell export line + stderr hint with --shell", async () => {
    mocks.getToken.mockResolvedValueOnce("tok-123");
    mocks.getCredentials.mockReturnValueOnce({
      expires_at: Date.now() + 3_600_000,
    });
    const out = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const err = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    await createProgram().parseAsync([
      "node",
      "liquidlm",
      "token",
      "export",
      "--shell",
    ]);

    expect(out).toHaveBeenCalledWith("export LIQUIDLM_API_TOKEN=tok-123\n");
    expect(err).toHaveBeenCalled();
  });

  it("emits JSON with --json", async () => {
    mocks.getToken.mockResolvedValueOnce("tok-123");
    mocks.getCredentials.mockReturnValueOnce({ expires_at: 42 });
    const out = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    await createProgram().parseAsync([
      "node",
      "liquidlm",
      "token",
      "export",
      "--json",
    ]);

    expect(out).toHaveBeenCalledWith(
      JSON.stringify({ access_token: "tok-123", expires_at: 42 }) + "\n",
    );
  });
});
