/**
 * Single source of truth for the CLI executable name and version. CLI_NAME MUST
 * match the `bin` key in `packages/cli/package.json` and the command string
 * `mcp install` writes into client configs (`STDIO_COMMAND` in `mcp-config.ts`),
 * so a remote client always launches the binary that is actually installed.
 * CLI_VERSION is read from package.json (one directory up from both `src/` in
 * dev and `dist/` once built) so a release bumps the version in a single place.
 */
import { createRequire } from "node:module";

export const CLI_NAME = "liquidlm";

const pkg = createRequire(import.meta.url)("../package.json") as {
  version: string;
};
export const CLI_VERSION = pkg.version;
