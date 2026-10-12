# Support and compatibility

Alpha software with community support and no managed-service SLA. Questions and
bugs go to GitHub issues on this repository; `support@liquidlm.com` is the
fallback channel. Hosted service access is separate from the source license.
SDK operation availability follows the server's public API contract and the
caller's scopes.

The CLI declares Node 18 as its minimum. The verified matrix for this release:

| Environment                                                    | Verified                                                                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS ARM64, Node 26.5.1                                       | build, tests, examples, package checks; installed comparison vs npm 0.1.6 (48 checks); interactive login/keychain/file-backend (2026-10-12) |
| Debian Linux ARM64, Node 18.20.8 / 20.20.2 / 22.23.3 / 24.21.0 | installed comparison vs npm 0.1.6 (48 checks each); full release suite on Node 22/24                                                        |
| Debian Linux AMD64, Node 18.20.8 / 24.21.0                     | installed comparison via emulation; native x64 covered by public CI on `ubuntu-latest`                                                      |
| Windows                                                        | unverified — do not infer Windows credential protection from POSIX tests                                                                    |

Credential storage uses the OS keychain with an explicit file fallback
(`LIQUIDLM_CREDENTIAL_STORE=file`, mode 0600). SDK usage in browsers is not
supported in this release.

Use semver for API changes. Document credential/configuration migrations, and
keep old releases available with explicit security/support status. No server or
cloud upgrade is performed by installing this CLI.
