# Release preparation and publication

This candidate has not been published. The current CLI version is a compatibility
baseline, not a version that may overwrite the existing npm release.

## Prepare a candidate

1. Choose an unused prerelease version, update package metadata and CLI branding
   together, update the lock and changelog, and pin the SDK version used by the CLI.
2. Run `npm ci` then `npm run release:prepare` from a clean checkout. This validates
   formatting, lint, build, types, tests, examples and real npm archives. It writes
   archive hashes, dependency licenses/notices, SBOM and a manifest to `artifacts/`.
3. Install those archives in an empty project. Exercise configured endpoints,
   PAT/session auth, keychain/file fallback, `QUERY`, uploads, MCP and conventions
   on the supported platforms. Use synthetic data and a test account for live
   identity checks; never attach credentials or customer data to the evidence.
4. Compare repeated builds' archive hashes with the same lock/runtime. Review
   source/archives for secrets, private paths, assets and third-party obligations.
   Record intentional output/auth differences and known unsupported platforms.

The manifest records Node, npm, zlib, platform, lock and contract hashes. Compare
both `.tgz` SHA-256 and uncompressed tar SHA-256: different compression toolchains
can encode identical package contents differently. Publish checksums of the actual
registry downloads and retain the exact build environment in the evidence.

The GitHub release-candidate workflow prepares and uploads this evidence only.
It has no publishing token, OIDC write permission or publish command. Downloading
an artifact is not evidence that all platform or manual release checks passed.

## First public release

The owner must confirm repository/npm ownership, approve the license/trademark
and contribution texts, and configure a real private vulnerability-reporting
channel. Replace candidate-only SECURITY/SUPPORT notices and set package repository,
homepage and issue URLs to the actual public repository. Protect the release tag
and require review of the exact commit and evidence. Publish the SDK prerelease
before the CLI that consumes it; use the prerelease npm tag rather than `latest`.

Configure a dedicated, protected publishing workflow after that decision. Use
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) with the actual
repository/workflow/environment identity, a compatible Node/npm version and only
the required OIDC permission. It avoids a long-lived publishing token. npm's
provenance conditions include a public source repository and public package; a
local manifest is not an attestation. Verify the registry archive and attestation
after publication. First-package setup and account authority are owner tasks.

Never grant public CI credentials that deploy hosted infrastructure. Do not publish
from this private source checkout or let a private deployment workflow push source
into a public branch. Enable links and installation claims only after tags resolve.

## Recovery and support

Published versions are immutable. If a release regresses, stop promotion, document
the issue, select the previous known-good version explicitly, and ship a new fix
version. Review whether a registry deprecation notice is needed; do not silently
reuse a version. Update Homebrew/other installers only from the verified registry
archive. Credential migrations need a tested rollback path and must never destroy
an old credential format without a recovery instruction.

The initial release is experimental. Publish a tested runtime/platform matrix,
known gaps and a realistic support policy. A CI matrix entry is an intended check,
not evidence of a pass until the workflow actually runs.
