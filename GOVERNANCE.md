# Governance and releases

Maintainers review changes, protect the default branch and require CI checks.
Changes to authentication, credential storage, upload handling and publication
boundaries require explicit maintainer review. The MIT code license does not
grant use of the LiquidLM name or artwork as a trademark.

Release prerequisites: approved license/trademark and contribution policies,
verified repository/package ownership, supported-platform tests, dependency and
secret scans, package-content review, SBOM, provenance and a private security
reporting path. Configure trusted publishing with least privilege. Release jobs
must never receive credentials that can deploy hosted infrastructure.

This candidate contains no automatic publishing job. Prepare versioned SDK/CLI
packages and review exact contents before enabling the first release. A future
release workflow should support prereleases and rollback/yank documentation.
