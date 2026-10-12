# LiquidLM TypeScript clients

Source release candidate for the LiquidLM SDK and CLI. The SDK targets both
hosted and self-hosted public APIs. The CLI preserves its existing `liquidlm`
command and credential/configuration formats.

```sh
npm ci
npm run release:prepare
```

Development requires Node >=22.14. This command validates format/lint, builds,
types, tests, generated docs, examples and package archives, then writes release
evidence. It never publishes. See [RELEASING.md](RELEASING.md) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the remaining review gates.

See `packages/sdk/README.md` for transport and generated types, and
`packages/cli/README.md` for commands and login. No server, database, cloud
credentials or private source checkout is required to build and test.

The API snapshot under `packages/sdk/contract` is checksummed. Contract upgrades
must update the snapshot, manifest and generated types together after review.
Tests use synthetic data and injected transports; they do not call a hosted
account. Live tests require explicit operator-supplied credentials.

`package:check` writes SDK/CLI archives and an integrity/file report under
`artifacts/`. It rejects unexpected archive paths, source maps, private package
references and local runtime dependencies. It is one release check, alongside
dependency/secret/license review and installation on supported platforms.

This candidate has not been published, assigned a public repository URL or
certified as a supported release. A future tagged release must provide its lock,
package checksums, SBOM, provenance and supported runtime/platform matrix.
