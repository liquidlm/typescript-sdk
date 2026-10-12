# Changelog

## 0.2.0-alpha.1 (CLI)

- `skill` supports all assistant clients (`claude-code`, `codex`, `opencode`,
  `cursor`, `generic`) with checksum-guarded managed blocks: install, repeated
  install, update, hand-edit detection (`--force`), `--uninstall` and rolling
  `.liquidlm.bak` backups. Shared instruction files keep unrelated content.
- `mcp install --with-skill` also installs the conventions block — one command
  sets up both the MCP tools and the assistant conventions.
- `--out <path>`/`-` keeps its 0.1.6 whole-file behavior with no block markers.
- The `cursor` target now writes `.cursor/rules/liquidlm.mdc` instead of a
  plain `LIQUIDLM.md` (the old flag was accepted but ignored).
- Managed-block bytes are parity-pinned against the `liquidlm/skills`
  repository installer by a shared fixture hash in both test suites.

## 0.2.0-alpha.0 (CLI) / 0.1.0-alpha.0 (SDK) — prerelease candidate

- Add a public-contract TypeScript SDK with configurable transport and endpoint.
- Bundle the public SDK in the CLI instead of private server utilities.
- Embed assistant conventions so installed CLI packages work outside a checkout.
- Omit request/response bodies from verbose transport logs and bound requests.
- Preserve CLI command names, credential/config formats and headless login paths.
- `--version` reports the new prerelease; all other command output, exit codes
  and stored credential/config formats are unchanged from npm CLI 0.1.6.
