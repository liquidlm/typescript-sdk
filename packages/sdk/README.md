# LiquidLM TypeScript SDK

Release candidate for the public LiquidLM API. No package publication is implied
by this source tree. Requires Node.js 18 or later with `fetch`.

```ts
import { LiquidLMClient } from "@liquidlm/sdk";
const client = new LiquidLMClient({
  baseUrl: "http://localhost:3002", // or your hosted API origin
  token: process.env.LIQUIDLM_TOKEN,
});
const vaults = await client.vaults.list();
const results = await client.query("/search/hybrid", {
  query: "prior decisions",
  limit: 10,
});
```

Use `call(operationId, { parameters, body, options })` for generated operation
input/output types, or `get/post/put/patch/delete/query` for explicit requests.
`Schemas` and `Operations` are generated from the pinned public contract.
Custom API prefixes are supported; `/v1` is added when omitted.

See the [generated operation/schema reference](docs/API.md), the
[native authentication supplement](docs/SESSION_AUTH.md), and the runnable
[synthetic example](examples/synthetic.ts). The example makes no network calls.

A token provider can refresh credentials before each request. `activeOrg` sets
`X-LiquidLM-Active-Org`; omit it for a PAT whose scope already chooses an
organization. Browser applications should use their server's supported session
flow instead of persisting bearer credentials in browser storage.

`RequestOptions.signal` cancels requests. The default deadline is 30 seconds and
covers body consumption, including streams; configure a longer bounded deadline
for chat. `stream(path, body)` yields SSE events and cancels the underlying stream
when iteration stops. `raw` returns a standard response for binary/multipart
operations; consumers must consume or cancel its body.

Retries default to zero. Opt-in `maxRetries` applies only to GET, HEAD and QUERY,
never mutation requests. Transport errors contain status, a validated request ID
and a safe code, without retaining response bodies or credential-bearing URLs.
JSON responses and individual SSE events have a configurable size ceiling.
Redirects are rejected, and API paths cannot escape the configured base URL.

## Build and contract checks

```sh
npm run build
npm test
```

`contract/manifest.json` pins the OpenAPI SHA-256. Generation rejects private
operations, unresolved references and checksum drift. Update the snapshot and
pin only as a reviewed contract change. Generated source is checked into this
candidate so builds need no private server or network schema fetch.

`upload(vaultId, fileName, bytes)` implements the versioned upload-attempt
protocol: SHA-256, a single storage PUT without API credentials, finalize, and
reconcile/abort for ambiguous outcomes. Retain `UnresolvedUploadError.attemptId`
when the outcome cannot be confirmed; never blindly retry the whole upload.
`listKnowledge(parameters, { maxPages })` iterates bounded offset pagination.
Concurrent changes can affect offset listings; use server export operations for
snapshot requirements.

The SDK runtime is Node-oriented (upload hashing uses Node crypto). Development
uses Node >=22.14 and a patched test runner. Authentication/
device-grant orchestration currently remains in the CLI; raw API requests support
explicit unauthenticated auth/discovery calls. No public release is claimed until
the clean-room, package, security and ownership gates are complete.
