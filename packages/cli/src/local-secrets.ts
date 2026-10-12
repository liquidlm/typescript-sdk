import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";

/** Owner-only directory for CLI config and credentials. */
export const PRIVATE_DIR_MODE = 0o700;

/** Owner-only secret files (credentials, config). */
export const SECRET_FILE_MODE = 0o600;

export function ensurePrivateDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: PRIVATE_DIR_MODE });
  }

  try {
    chmodSync(dir, PRIVATE_DIR_MODE);
  } catch {
    // Best-effort on platforms that restrict chmod.
  }
}

export function writePrivateFile(path: string, contents: string): void {
  writeFileSync(path, contents, { mode: SECRET_FILE_MODE });
  try {
    chmodSync(path, SECRET_FILE_MODE);
  } catch {
    // Best-effort.
  }
}

export function hardenPrivateFile(path: string): void {
  if (!existsSync(path)) return;
  try {
    chmodSync(path, SECRET_FILE_MODE);
  } catch {
    // Best-effort.
  }
}

export function hardenPrivateDir(dir: string): void {
  if (!existsSync(dir)) return;
  try {
    chmodSync(dir, PRIVATE_DIR_MODE);
  } catch {
    // Best-effort.
  }
}
