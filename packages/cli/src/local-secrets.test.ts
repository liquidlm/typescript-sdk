import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  PRIVATE_DIR_MODE,
  SECRET_FILE_MODE,
  ensurePrivateDir,
  hardenPrivateDir,
  hardenPrivateFile,
  writePrivateFile,
} from "./local-secrets.js";

const tempRoots: string[] = [];

function makeTempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "liquidlm-secrets-"));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    if (existsSync(root)) {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

describe("local-secrets", () => {
  it("creates config directories with mode 0700", () => {
    const root = makeTempRoot();
    const dir = join(root, "nested", ".liquidlm");

    ensurePrivateDir(dir);

    expect(statSync(dir).mode & 0o777).toBe(PRIVATE_DIR_MODE);
  });

  it("writes secret files with mode 0600", () => {
    const root = makeTempRoot();
    const dir = join(root, ".liquidlm");
    ensurePrivateDir(dir);
    const file = join(dir, "credentials.json");

    writePrivateFile(file, '{"token":"x"}\n');

    expect(readFileSync(file, "utf-8")).toBe('{"token":"x"}\n');
    expect(statSync(file).mode & 0o777).toBe(SECRET_FILE_MODE);
  });

  it("hardens existing loose directory and file permissions", () => {
    const root = makeTempRoot();
    const dir = join(root, ".liquidlm");
    mkdirSync(dir, { mode: 0o755 });
    const file = join(dir, "config.json");
    writeFileSync(file, "{}\n", { mode: 0o644 });

    hardenPrivateDir(dir);
    hardenPrivateFile(file);

    expect(statSync(dir).mode & 0o777).toBe(PRIVATE_DIR_MODE);
    expect(statSync(file).mode & 0o777).toBe(SECRET_FILE_MODE);
  });

  it("re-applies 0600 when rewriting an existing secret file", () => {
    const root = makeTempRoot();
    const dir = join(root, ".liquidlm");
    ensurePrivateDir(dir);
    const file = join(dir, "credentials.json");
    writePrivateFile(file, "v1\n");
    chmodSync(file, 0o644);

    writePrivateFile(file, "v2\n");

    expect(readFileSync(file, "utf-8")).toBe("v2\n");
    expect(statSync(file).mode & 0o777).toBe(SECRET_FILE_MODE);
  });
});
