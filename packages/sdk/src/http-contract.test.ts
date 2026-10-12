import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { afterEach, describe, expect, it } from "vitest";
import { LiquidLMClient } from "./client.js";

let server: Server | undefined;
afterEach(async () => {
  if (!server) return;
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server!.close((e) => (e ? reject(e) : resolve())),
  );
  server = undefined;
});

describe("public HTTP contract fixture", () => {
  it("round-trips QUERY and upload-attempt finalization over real local HTTP", async () => {
    let baseUrl = "";
    let stored = Buffer.alloc(0);
    const requests: Array<{
      method: string;
      path: string;
      authorized: boolean;
    }> = [];
    server = createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const bytes = Buffer.concat(chunks);
      requests.push({
        method: req.method!,
        path: req.url!,
        authorized: !!req.headers.authorization,
      });
      const send = (value: unknown) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(value));
      };
      if (req.url === "/object") {
        stored = bytes;
        res.setHeader("x-amz-version-id", "fixture-version");
        res.end();
        return;
      }
      if (req.headers.authorization !== "Bearer fixture-pat") {
        res.statusCode = 401;
        send({ error: "Unauthorized" });
        return;
      }
      if (req.url === "/v1/search/hybrid") {
        send({
          results: [],
          received: JSON.parse(bytes.toString()),
          org: req.headers["x-liquidlm-active-org"],
        });
        return;
      }
      if (req.url?.endsWith("/presign")) {
        const input = JSON.parse(bytes.toString());
        send({
          uploadUrl: `${baseUrl}/object`,
          protocol: "attempt-v1",
          attemptId: input.attemptId,
        });
        return;
      }
      if (req.url?.endsWith("/finalize")) {
        send({ knowledgeId: "fixture-knowledge", s3Key: "files/fixture" });
        return;
      }
      res.statusCode = 404;
      send({ error: "Unknown fixture operation" });
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Fixture port missing");
    baseUrl = `http://127.0.0.1:${address.port}`;
    const sdk = new LiquidLMClient({
      baseUrl,
      token: "fixture-pat",
      activeOrg: "fixture-org",
    });
    expect(
      await sdk.query("/search/hybrid", { query: "synthetic memory" }),
    ).toEqual({
      results: [],
      received: { query: "synthetic memory" },
      org: "fixture-org",
    });
    const result = await sdk.upload(
      "fixture-vault",
      "fixture.txt",
      new TextEncoder().encode("synthetic content"),
    );
    expect(result.knowledgeId).toBe("fixture-knowledge");
    expect(stored.toString()).toBe("synthetic content");
    expect(requests.map((r) => [r.method, r.path, r.authorized])).toEqual([
      ["QUERY", "/v1/search/hybrid", true],
      ["POST", "/v1/vaults/fixture-vault/upload/presign", true],
      ["PUT", "/object", false],
      ["POST", "/v1/vaults/fixture-vault/upload/finalize", true],
    ]);
  });
});
