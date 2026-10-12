import { LiquidLMError } from "./errors.js";
export { LiquidLMError } from "./errors.js";
import { uploadFile, type UploadOptions, type UploadResult } from "./upload.js";
import type { Operations, Schemas } from "./generated.js";
import { OPERATION_METADATA } from "./generated.js";

export type ValueProvider = string | (() => string | Promise<string>);
export interface ClientOptions {
  /** API origin or an API root ending in /v1. */
  baseUrl?: string;
  token?: ValueProvider;
  activeOrg?: ValueProvider;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  /** Retries are opt-in and restricted to GET, HEAD and QUERY. */
  maxRetries?: number;
  maxResponseBytes?: number;
}
export interface RequestOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
  timeoutMs?: number;
  /** Auth endpoints can explicitly omit bearer credentials. */
  authenticated?: boolean;
}
export interface RawRequestOptions extends RequestOptions {
  body?: BodyInit;
}
export interface StreamEvent {
  event: string;
  data: string;
  id?: string;
}

function boundedInteger(
  value: number,
  name: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
    throw new TypeError(
      `${name} must be an integer from ${minimum} to ${maximum}`,
    );
  return value;
}
function metadata(value: string | null): string | undefined {
  return value && /^[\w.:-]{1,128}$/.test(value) ? value : undefined;
}
function endpoint(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new TypeError("baseUrl must be a valid HTTP(S) API URL");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new TypeError(
      "baseUrl must be an HTTP(S) API URL without credentials, query or fragment",
    );
  const base = url.href.replace(/\/+$/, "");
  return base.endsWith("/v1") ? base : `${base}/v1`;
}
function relativeUrl(base: string, path: string): string {
  if (
    !path ||
    /^(?:[a-z][\w+.-]*:|\/\/)/i.test(path) ||
    path.includes("\\") ||
    path.includes("#")
  )
    throw new TypeError("API request paths must be relative to baseUrl");
  const url = new URL(`${base}/${path.replace(/^\//, "")}`);
  // Dot segments must not escape a deployment's API prefix.
  if (!url.href.startsWith(`${base}/`))
    throw new TypeError("API request path escapes baseUrl");
  return url.href;
}
async function valueOf(value?: ValueProvider): Promise<string | undefined> {
  return typeof value === "function" ? value() : value;
}

export class LiquidLMClient {
  readonly baseUrl: string;
  private readonly options: ClientOptions;
  private readonly fetcher: typeof globalThis.fetch;
  constructor(options: ClientOptions = {}) {
    this.options = options;
    this.baseUrl = endpoint(options.baseUrl ?? "https://api.liquidlm.com");
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    boundedInteger(options.timeoutMs ?? 30_000, "timeoutMs", 1, 3_600_000);
    boundedInteger(options.maxRetries ?? 0, "maxRetries", 0, 3);
    boundedInteger(
      options.maxResponseBytes ?? 16 * 1024 * 1024,
      "maxResponseBytes",
      1,
      256 * 1024 * 1024,
    );
  }

  /** Returns the response without interpreting HTTP error bodies. Cancel unused bodies. */
  async raw(
    method: string,
    path: string,
    options: RawRequestOptions = {},
  ): Promise<Response> {
    const url = relativeUrl(this.baseUrl, path);
    const timeout = boundedInteger(
      options.timeoutMs ?? this.options.timeoutMs ?? 30_000,
      "timeoutMs",
      1,
      3_600_000,
    );
    const headers = new Headers(options.headers);
    if (options.authenticated !== false) {
      const token = await valueOf(this.options.token);
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }
    const org = await valueOf(this.options.activeOrg);
    if (org) headers.set("X-LiquidLM-Active-Org", org);
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) controller.abort();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);
    const cleanup = () => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    };
    const failure = () =>
      new LiquidLMError(
        timedOut
          ? "LiquidLM request timed out"
          : controller.signal.aborted
            ? "LiquidLM request cancelled"
            : "LiquidLM network request failed",
        {
          code: timedOut
            ? "timeout"
            : controller.signal.aborted
              ? "cancelled"
              : "network_error",
        },
      );
    const verb = method.toUpperCase();
    const retries = ["GET", "HEAD", "QUERY"].includes(verb)
      ? (this.options.maxRetries ?? 0)
      : 0;
    try {
      let response: Response | undefined;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          response = await this.fetcher(url, {
            method: verb,
            headers,
            body: options.body,
            signal: controller.signal,
            redirect: "error",
          });
          if (
            ![429, 502, 503, 504].includes(response.status) ||
            attempt === retries
          )
            break;
          await response.body?.cancel();
        } catch {
          if (controller.signal.aborted || attempt === retries) throw failure();
        }
        await new Promise<void>((resolve, reject) => {
          const done = () => {
            clearTimeout(delay);
            controller.signal.removeEventListener("abort", stop);
          };
          const stop = () => {
            done();
            reject(failure());
          };
          const delay = setTimeout(
            () => {
              done();
              resolve();
            },
            200 * 2 ** attempt,
          );
          controller.signal.addEventListener("abort", stop, { once: true });
          if (controller.signal.aborted) stop();
        });
      }
      if (!response) throw failure();
      if (!response.body) {
        cleanup();
        return response;
      }
      const reader = response.body.getReader();
      // Keep the deadline active until the body is consumed, including SSE.
      const body = new ReadableStream<Uint8Array>({
        async pull(stream) {
          try {
            const part = await reader.read();
            if (part.done) {
              cleanup();
              stream.close();
            } else stream.enqueue(part.value);
          } catch {
            cleanup();
            stream.error(failure());
          }
        },
        async cancel(reason) {
          cleanup();
          controller.abort();
          await reader.cancel(reason);
        },
      });
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      cleanup();
      throw error instanceof LiquidLMError ? error : failure();
    }
  }

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const headers = new Headers(options.headers);
    if (body !== undefined) headers.set("Content-Type", "application/json");
    const response = await this.raw(method, path, {
      ...options,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new LiquidLMError(
        `LiquidLM request failed (HTTP ${response.status})`,
        {
          status: response.status,
          requestId: metadata(response.headers.get("x-request-id")),
        },
      );
    }
    if (response.status === 204 || !response.body) {
      await response.body?.cancel();
      return undefined as T;
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > (this.options.maxResponseBytes ?? 16 * 1024 * 1024))
          throw new LiquidLMError(
            "LiquidLM response exceeded the configured size limit",
            { status: response.status, code: "response_too_large" },
          );
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      if (!size) return undefined as T;
      try {
        return JSON.parse(new TextDecoder().decode(bytes)) as T;
      } catch {
        throw new LiquidLMError("LiquidLM returned invalid JSON", {
          status: response.status,
          code: "invalid_json",
        });
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
  }

  get<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.request("GET", path, undefined, options);
  }
  query<T = unknown>(
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request("QUERY", path, body, options);
  }
  post<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request("POST", path, body, options);
  }
  put<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request("PUT", path, body, options);
  }
  patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request("PATCH", path, body, options);
  }
  delete<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.request("DELETE", path, undefined, options);
  }

  call<K extends keyof Operations>(
    operation: K,
    args: {
      parameters?: Operations[K]["parameters"];
      body?: Operations[K]["body"];
      options?: RequestOptions;
    } = {},
  ): Promise<Operations[K]["response"]> {
    const definition = OPERATION_METADATA[operation];
    const parameters = { ...args.parameters } as Record<string, unknown>;
    const path = definition.path.replace(/\{([^}]+)\}/g, (_, key: string) => {
      if (parameters[key] === undefined)
        throw new TypeError(`Missing path parameter: ${key}`);
      const result = encodeURIComponent(String(parameters[key]));
      delete parameters[key];
      return result;
    });
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(parameters))
      if (value !== undefined)
        query.set(key, Array.isArray(value) ? value.join(",") : String(value));
    return this.request(
      definition.method,
      `${path}${query.size ? `?${query}` : ""}`,
      args.body,
      args.options,
    );
  }

  /** Offset pagination follows the API contract; it is not a snapshot export. */
  async *listKnowledge(
    parameters: Operations["getKnowledge"]["parameters"] = {},
    options: RequestOptions & { maxPages?: number } = {},
  ): AsyncGenerator<Schemas["KnowledgeRecord"]> {
    const maxPages = boundedInteger(
      options.maxPages ?? 100,
      "maxPages",
      1,
      10_000,
    );
    const limit = boundedInteger(parameters.limit ?? 100, "limit", 1, 1000);
    let offset = parameters.offset ?? 0;
    for (let page = 0; page < maxPages; page++) {
      const result = await this.call("getKnowledge", {
        parameters: { ...parameters, limit, offset },
        options,
      });
      for (const item of result.items) yield item;
      if (!result.hasMore) return;
      if (!result.items.length)
        throw new LiquidLMError("Pagination made no progress", {
          code: "invalid_pagination",
        });
      offset += result.items.length;
    }
    throw new LiquidLMError("Pagination exceeded maxPages", {
      code: "pagination_limit",
    });
  }

  upload(
    vaultId: string,
    fileName: string,
    bytes: Uint8Array,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    return uploadFile(
      { post: this.post.bind(this), fetch: this.fetcher },
      vaultId,
      fileName,
      bytes,
      options,
    );
  }

  readonly vaults = {
    list: (options?: RequestOptions): Promise<Schemas["Vault"][]> =>
      this.get("/vaults", options),
    create: (
      body: Schemas["CreateVaultBody"],
      options?: RequestOptions,
    ): Promise<Schemas["Vault"]> => this.post("/vaults", body, options),
  };

  /** Reads SSE incrementally. Breaking iteration cancels the response and deadline. */
  async *stream(
    path: string,
    body: unknown,
    options: RequestOptions = {},
  ): AsyncGenerator<StreamEvent> {
    const response = await this.raw("POST", path, {
      ...options,
      body: JSON.stringify(body),
      headers: {
        ...Object.fromEntries(new Headers(options.headers)),
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new LiquidLMError(
        `LiquidLM stream failed (HTTP ${response.status})`,
        { status: response.status },
      );
    }
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "",
      event = "message",
      id: string | undefined,
      data: string[] = [],
      eventSize = 0;
    try {
      for (;;) {
        const part = await reader.read();
        buffer += part.done
          ? decoder.decode()
          : decoder.decode(part.value, { stream: true });
        let end: number;
        while ((end = buffer.search(/[\r\n]/)) >= 0) {
          if (buffer[end] === "\r" && end === buffer.length - 1 && !part.done)
            break;
          const width =
            buffer[end] === "\r" && buffer[end + 1] === "\n" ? 2 : 1;
          const line = buffer.slice(0, end);
          buffer = buffer.slice(end + width);
          const lineBytes = new TextEncoder().encode(line).byteLength;
          if (lineBytes > (this.options.maxResponseBytes ?? 16 * 1024 * 1024))
            throw new LiquidLMError("SSE line exceeded size limit", {
              code: "response_too_large",
            });
          if (!line) {
            if (data.length)
              yield {
                event,
                data: data.join("\n"),
                ...(id === undefined ? {} : { id }),
              };
            event = "message";
            data = [];
            eventSize = 0;
          } else if (!line.startsWith(":")) {
            const colon = line.indexOf(":");
            const key = colon < 0 ? line : line.slice(0, colon);
            const value =
              colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
            if (key === "data") data.push(value);
            if (key === "event") event = value || "message";
            if (key === "id" && !value.includes("\0")) id = value;
            eventSize += lineBytes;
          }
          if (eventSize > (this.options.maxResponseBytes ?? 16 * 1024 * 1024))
            throw new LiquidLMError("SSE event exceeded size limit", {
              code: "response_too_large",
            });
        }
        if (
          new TextEncoder().encode(buffer).byteLength >
          (this.options.maxResponseBytes ?? 16 * 1024 * 1024)
        )
          throw new LiquidLMError("SSE event exceeded size limit", {
            code: "response_too_large",
          });
        if (part.done) break;
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
  }
}
