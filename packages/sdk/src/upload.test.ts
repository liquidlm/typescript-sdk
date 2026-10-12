import { describe, expect, it, vi } from "vitest";
import {
  uploadFile,
  UnresolvedUploadError,
  type UploadTransport,
} from "./upload.js";

const options = { contentType: "text/plain", attemptId: "fixture-attempt" };
const receipt = {
  state: "committed",
  knowledgeId: "knowledge-fixture",
  s3Key: "files/fixture",
};
const presign = {
  protocol: "attempt-v1",
  attemptId: options.attemptId,
  uploadUrl: "https://storage.example/file?signature=private",
};
function setup(replies: unknown[]) {
  const post = vi.fn();
  replies.forEach((reply) =>
    reply instanceof Error
      ? post.mockRejectedValueOnce(reply)
      : post.mockResolvedValueOnce(reply),
  );
  const fetch = vi.fn(
    async () =>
      new Response(null, {
        status: 200,
        headers: { "x-amz-version-id": "version-fixture" },
      }),
  );
  return { transport: { post, fetch } as UploadTransport, post, fetch };
}
describe("safe upload attempts", () => {
  it("uses one attempt, hashes bytes and never sends API credentials to storage", async () => {
    const { transport, post, fetch } = setup([presign, receipt]);
    const result = await uploadFile(
      transport,
      "vault/fixture",
      "note.txt",
      new TextEncoder().encode("hello"),
      options,
    );
    expect(result).toEqual({
      s3Key: receipt.s3Key,
      knowledgeId: receipt.knowledgeId,
      attemptId: options.attemptId,
    });
    expect(post.mock.calls[0][0]).toBe(
      "/vaults/vault%2Ffixture/upload/presign",
    );
    expect(post.mock.calls[0][1].contentSha256Hex).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
    expect(
      new Headers(fetch.mock.calls[0]?.[1]?.headers).has("Authorization"),
    ).toBe(false);
    expect(post.mock.calls[1][1]).toMatchObject({
      attemptId: options.attemptId,
      s3VersionId: "version-fixture",
    });
  });
  it("reconciles a lost finalize response without repeating the storage write", async () => {
    const { transport, post, fetch } = setup([
      presign,
      new Error("connection lost"),
      receipt,
    ]);
    await expect(
      uploadFile(transport, "vault", "note.txt", new Uint8Array([1]), options),
    ).resolves.toMatchObject({ knowledgeId: receipt.knowledgeId });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[2][0]).toMatch(/\/reconcile$/);
    expect(post.mock.calls[2][2]).toEqual({ timeoutMs: 5000 });
  });
  it("aborts an uncommitted attempt after storage failure", async () => {
    const { transport, post, fetch } = setup([
      presign,
      { state: "pending" },
      { state: "aborted" },
    ]);
    fetch.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await expect(
      uploadFile(transport, "vault", "note.txt", new Uint8Array([1]), options),
    ).rejects.toMatchObject({ code: "storage_upload_failed" });
    expect(post.mock.calls[2][0]).toMatch(/\/abort$/);
  });
  it("reports an ambiguous cleanup with the attempt ID, without leaking signed URLs", async () => {
    const { transport, fetch } = setup([
      presign,
      new Error("private response"),
    ]);
    fetch.mockRejectedValueOnce(new Error(presign.uploadUrl));
    const error = await uploadFile(
      transport,
      "vault",
      "note.txt",
      new Uint8Array([1]),
      options,
    ).catch((e) => e);
    expect(error).toBeInstanceOf(UnresolvedUploadError);
    expect(error.attemptId).toBe(options.attemptId);
    expect(String(error)).not.toContain("signature");
  });
  it("recognizes a finalize/abort race that has already committed", async () => {
    const { transport, fetch } = setup([
      presign,
      { state: "pending" },
      receipt,
    ]);
    fetch.mockRejectedValueOnce(new Error("disconnected"));
    await expect(
      uploadFile(transport, "vault", "note.txt", new Uint8Array([1]), options),
    ).resolves.toMatchObject({ knowledgeId: receipt.knowledgeId });
  });
  it("rejects a mismatched protocol before sending file bytes", async () => {
    const { transport, fetch } = setup([{ ...presign, attemptId: "other" }]);
    await expect(
      uploadFile(transport, "vault", "note.txt", new Uint8Array([1]), options),
    ).rejects.toMatchObject({ code: "upload_protocol_mismatch" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
