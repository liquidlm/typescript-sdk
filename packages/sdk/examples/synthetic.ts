import assert from "node:assert/strict";
import { LiquidLMClient, LiquidLMError } from "@liquidlm/sdk";

// Runs without credentials, an API server or model charges. Replace this fetch
// fixture with the default transport and a caller-supplied token for a real API.
const client = new LiquidLMClient({
  baseUrl: "https://memory.example.test",
  token: "synthetic-example-token",
  fetch: async (url, init) => {
    const path = new URL(String(url)).pathname;
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      "Bearer synthetic-example-token",
    );
    if (path === "/v1/vaults") return Response.json([]);
    if (path === "/v1/search/hybrid") {
      assert.equal(init?.method, "QUERY");
      return Response.json({ results: [] });
    }
    return new Response(null, { status: 404 });
  },
});

const vaults = await client.call("getVaults");
assert.deepEqual(vaults, []);
const search = await client.query<{ results: unknown[] }>("/search/hybrid", {
  query: "previous decisions",
  limit: 5,
});
assert.deepEqual(search.results, []);
try {
  await client.get("/missing");
  assert.fail("Expected a safe HTTP error");
} catch (error) {
  assert.ok(error instanceof LiquidLMError);
  assert.equal(error.status, 404);
}
console.log("Typed calls, QUERY and safe errors passed using synthetic data.");
