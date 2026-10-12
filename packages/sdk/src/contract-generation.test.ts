import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, expect, it } from "vitest";

let fixture: string;
beforeEach(() => {
  fixture = mkdtempSync(join(tmpdir(), "liquidlm-contract-"));
  const root = fileURLToPath(new URL("../", import.meta.url));
  for (const dir of ["contract", "scripts", "src", "docs"])
    cpSync(join(root, dir), join(fixture, dir), { recursive: true });
});
afterEach(() => rmSync(fixture, { recursive: true, force: true }));
function run() {
  try {
    return execFileSync(
      process.execPath,
      [join(fixture, "scripts/generate-types.mjs"), "--check"],
      { encoding: "utf8", stdio: "pipe" },
    );
  } catch (error) {
    throw new Error(String((error as { stderr: Buffer }).stderr), {
      cause: error,
    });
  }
}
function mutate(edit: (spec: any) => void, repin = true) {
  const path = join(fixture, "contract/openapi.json");
  const spec = JSON.parse(readFileSync(path, "utf8"));
  edit(spec);
  const bytes = JSON.stringify(spec);
  writeFileSync(path, bytes);
  if (repin) {
    const pinPath = join(fixture, "contract/manifest.json");
    const pin = JSON.parse(readFileSync(pinPath, "utf8"));
    pin.sha256 = createHash("sha256").update(bytes).digest("hex");
    writeFileSync(pinPath, JSON.stringify(pin));
  }
}
it("reproduces the reviewed public snapshot", () =>
  expect(run()).toContain("80 operations"));
it("rejects changed contracts without a reviewed pin", () => {
  mutate((spec) => {
    spec.info.title = "Changed";
  }, false);
  expect(run).toThrow(/checksum mismatch/);
});
it("rejects a private route even if someone updates its checksum", () => {
  mutate((spec) => {
    spec.paths["/admin/fixtures"] = {
      get: { operationId: "privateFixture", responses: {} },
    };
  });
  expect(run).toThrow(/Private path/);
});
it("rejects session-only operations outside the explicit caller-profile exception", () => {
  mutate((spec) => {
    spec.paths["/fixtures"] = {
      get: {
        operationId: "privateFixture",
        "x-liquidlm-bearer-class": "session-only",
        responses: {},
      },
    };
  });
  expect(run).toThrow(/Private operation/);
});
it("rejects external schema references", () => {
  mutate((spec) => {
    spec.components.schemas.Fixture = {
      $ref: "https://private.example/schema",
    };
  });
  expect(run).toThrow(/Non-local schema reference/);
});
it("rejects hand-edited generated output", () => {
  writeFileSync(
    join(fixture, "src/generated.ts"),
    "// stale generated output\n",
  );
  expect(run).toThrow(/Generated contract drift/);
});
it("rejects stale generated API documentation", () => {
  writeFileSync(join(fixture, "docs/API.md"), "# stale reference\n");
  expect(run).toThrow(/API reference drift/);
});
