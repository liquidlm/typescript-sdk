# Contributing

Use synthetic fixtures, add regression tests for behavior changes, and run the
build, typecheck, tests and contract checks. Keep SDK transport independent of
server internals. Do not introduce private workspace imports, credentials,
production fixtures or automatic network calls in tests.

Describe user-visible compatibility changes in the pull request. Preserve CLI
configuration, credential storage, output and exit behavior unless the release
explicitly documents a migration. Submit general fixes upstream; hosted deployment
and operator tooling belong to the private downstream distribution.

Draft contribution policy: Developer Certificate of Origin (DCO) sign-off,
maintainer review and passing required checks. Maintainers must accept this policy
before first publication; no contributor license agreement is implied.
