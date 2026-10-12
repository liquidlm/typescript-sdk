import { createHash, randomUUID } from "node:crypto";
import type { RequestOptions } from "./client.js";
import { LiquidLMError } from "./errors.js";

export interface UploadReceipt {
  state?: string;
  knowledgeId?: string;
  s3Key?: string;
}
export interface UploadResult {
  s3Key: string;
  knowledgeId: string;
  attemptId: string;
}
export interface UploadOptions extends RequestOptions {
  contentType?: string;
  attemptId?: string;
}
export interface UploadTransport {
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  fetch: typeof globalThis.fetch;
}
export class UnresolvedUploadError extends LiquidLMError {
  constructor(readonly attemptId: string) {
    super(
      `Upload outcome is unresolved; retain attempt ${attemptId} for reconciliation`,
      { code: "upload_unresolved" },
    );
    this.name = "UnresolvedUploadError";
  }
}

/** Versioned upload-attempt protocol; never forwards API bearer credentials to storage. */
export async function uploadFile(
  transport: UploadTransport,
  vaultId: string,
  fileName: string,
  bytes: Uint8Array,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const attemptId = options.attemptId ?? randomUUID();
  if (!/^[\w-]{1,128}$/.test(attemptId))
    throw new TypeError("Invalid upload attempt ID");
  const root = `/vaults/${encodeURIComponent(vaultId)}/upload`;
  const hash = createHash("sha256").update(bytes).digest("hex");
  const complete = (receipt?: UploadReceipt): UploadResult => {
    if (!receipt?.knowledgeId || !receipt.s3Key)
      throw new UnresolvedUploadError(attemptId);
    return {
      s3Key: receipt.s3Key,
      knowledgeId: receipt.knowledgeId,
      attemptId,
    };
  };
  const presign = await transport.post<{
    uploadUrl: string;
    protocol: string;
    attemptId: string;
  }>(
    `${root}/presign`,
    {
      fileName,
      fileSize: bytes.byteLength,
      contentType: options.contentType,
      contentSha256Hex: hash,
      protocol: "attempt-v1",
      attemptId,
    },
    options,
  );
  if (presign.protocol !== "attempt-v1" || presign.attemptId !== attemptId)
    throw new LiquidLMError(
      "Server does not support the requested safe upload protocol",
      { code: "upload_protocol_mismatch" },
    );
  try {
    let url: URL;
    try {
      url = new URL(presign.uploadUrl);
    } catch {
      throw new LiquidLMError("Server returned an invalid storage URL", {
        code: "invalid_upload_url",
      });
    }
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.hash
    )
      throw new LiquidLMError("Server returned an invalid storage URL", {
        code: "invalid_upload_url",
      });
    const timeoutMs = options.timeoutMs ?? 120_000;
    if (
      !Number.isSafeInteger(timeoutMs) ||
      timeoutMs < 1 ||
      timeoutMs > 3_600_000
    )
      throw new TypeError(
        "Upload timeout must be between 1 and 3600000 milliseconds",
      );
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) controller.abort();
    const timer = setTimeout(abort, timeoutMs);
    let version: string | null;
    try {
      const put = await transport.fetch(url.href, {
        method: "PUT",
        body: new Blob([new Uint8Array(bytes)]),
        headers: {
          ...(options.contentType
            ? { "Content-Type": options.contentType }
            : {}),
          "x-amz-meta-sha256": hash,
        },
        signal: controller.signal,
        redirect: "error",
      });
      await put.body?.cancel();
      if (!put.ok)
        throw new LiquidLMError(`Storage upload failed (HTTP ${put.status})`, {
          status: put.status,
          code: "storage_upload_failed",
        });
      version = put.headers.get("x-amz-version-id");
    } catch (error) {
      throw error instanceof LiquidLMError
        ? error
        : new LiquidLMError("Storage upload failed", {
            code: controller.signal.aborted
              ? "cancelled"
              : "storage_upload_failed",
          });
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }
    return complete(
      await transport.post<UploadReceipt>(
        `${root}/finalize`,
        { fileName, attemptId, hash: `sha256:${hash}`, s3VersionId: version },
        options,
      ),
    );
  } catch (original) {
    // Reconcile with its own short deadline even when the original upload was
    // cancelled. Never replay the PUT or assume an ambiguous finalize failed.
    try {
      const receipt = await transport.post<UploadReceipt>(
        `${root}/reconcile`,
        { fileName, attemptId },
        { timeoutMs: 5000 },
      );
      if (receipt.state === "committed") return complete(receipt);
      if (receipt.state === "pending") {
        const aborted = await transport.post<UploadReceipt>(
          `${root}/abort`,
          { fileName, attemptId },
          { timeoutMs: 5000 },
        );
        if (aborted.state === "committed") return complete(aborted);
        if (aborted.state !== "aborted")
          throw new UnresolvedUploadError(attemptId);
      } else if (receipt.state !== "aborted" && receipt.state !== "rejected")
        throw new UnresolvedUploadError(attemptId);
    } catch {
      throw new UnresolvedUploadError(attemptId);
    }
    throw original instanceof LiquidLMError
      ? original
      : new LiquidLMError("Upload failed after cleanup", {
          code: "upload_failed",
        });
  }
}
