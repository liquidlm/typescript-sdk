import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("../client.js", () => ({
  apiClient: {
    query: mocks.query,
  },
}));

import { registerSearchCommands } from "./search.js";

function createProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerSearchCommands(program);
  return program;
}

describe("CLI search command", () => {
  beforeEach(() => {
    mocks.query.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses QUERY /search/hybrid by default", async () => {
    mocks.query.mockResolvedValueOnce({
      ok: true,
      data: {
        results: [
          {
            knowledge_id: "kid-1",
            chunk_id: "chunk-1",
            title: "Deploy notes",
            type: "file",
            vault_id: "vault-1",
            chunk: { content: "deploy with opentofu" },
            score: 0.9,
          },
        ],
      },
    });

    await createProgram().parseAsync(["node", "liquidlm", "search", "deploy"]);

    expect(mocks.query).toHaveBeenCalledWith("/search/hybrid", {
      query: "deploy",
      limit: 10,
    });
  });

  it("uses QUERY /search/fulltext for --fulltext", async () => {
    mocks.query.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          knowledge_id: "kid-1",
          chunk_id: "chunk-1",
          title: "Deploy notes",
          type: "file",
          vault_id: "vault-1",
          chunk: { content: "deploy with opentofu" },
          score: 1,
        },
      ],
    });

    await createProgram().parseAsync([
      "node",
      "liquidlm",
      "search",
      "deploy",
      "--fulltext",
      "--limit",
      "3",
    ]);

    expect(mocks.query).toHaveBeenCalledWith("/search/fulltext", {
      query: "deploy",
      limit: 3,
    });
  });
});
