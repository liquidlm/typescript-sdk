# Changelog

## 0.2.0-alpha.0 (CLI) / 0.1.0-alpha.0 (SDK) — prerelease candidate

- Add a public-contract TypeScript SDK with configurable transport and endpoint.
- Bundle the public SDK in the CLI instead of private server utilities.
- Embed assistant conventions so installed CLI packages work outside a checkout.
- Omit request/response bodies from verbose transport logs and bound requests.
- Preserve CLI command names, credential/config formats and headless login paths.
- `--version` reports the new prerelease; all other command output, exit codes
  and stored credential/config formats are unchanged from npm CLI 0.1.6.
