# Third-party dependencies

The LiquidLM SDK and CLI use the MIT license in their respective `LICENSE` files.
The CLI bundles the first-party SDK and portable LiquidLM helpers; it leaves
third-party runtime modules external. The SDK uses Node built-ins at runtime.
No third-party model weights, datasets, fonts or artwork are included here.

The CLI's declared runtime modules are `@modelcontextprotocol/sdk`,
`@napi-rs/keyring`, `commander` and `open`. Their installed packages and transitive
dependencies retain their own license and notice files. Do not remove those files
when redistributing an installation or image.

Run `npm run release:prepare` after `npm ci` to generate the exact locked dependency
inventory, CycloneDX SBOM and collected installed license/notice texts in
`artifacts/`. Optional packages for other operating systems are included in the
lock-based inventory even when absent from the local installation. Run the same
preparation on each supported platform to collect its installed texts.

Development tooling is listed separately from runtime dependencies. The lock may
include MIT, Apache, BSD, ISC and MPL components; the project's MIT license does
not replace their licenses. Review changes to identifiers, notices, vendored code
and bundled output before release. Missing metadata fails evidence generation;
an identifier alone is not a complete rights review.
