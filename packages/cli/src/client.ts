import { getApiUrl } from "./config.js";
import { getToken, getActiveOrgId, getEnvironmentToken } from "./auth.js";
import { LiquidLMClient, type RequestOptions } from "@liquidlm/sdk";
import { debug } from "./debug.js";

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
  ok: boolean;
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  let token: string;
  try {
    token = await getToken();
  } catch (err) {
    console.error(err instanceof Error ? err.message : "Authentication error.");
    process.exit(1);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  try {
    debug(`→ ${method} ${url}`);

    const sdk = new LiquidLMClient({
      baseUrl,
      token,
      activeOrg: getEnvironmentToken()
        ? undefined
        : (getActiveOrgId() ?? undefined),
    });
    const response = await sdk.raw(method, path, {
      ...options,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get("content-type") ?? "";
    let data: T | undefined;
    let error: string | undefined;
    let rawText: string | undefined;

    if (contentType.includes("application/json")) {
      rawText = await response.text();
      try {
        const json = JSON.parse(rawText);
        if (response.ok) {
          data = json as T;
        } else {
          error =
            ((json as Record<string, unknown>).message as string) ??
            ((json as Record<string, unknown>).error as string) ??
            JSON.stringify(json);
        }
      } catch {
        error = rawText;
      }
    } else if (!response.ok) {
      rawText = await response.text();
      error = rawText;
    }

    // Verbose diagnostics intentionally exclude content, bearer material and
    // signed storage URLs. Status/method are sufficient for transport debugging.
    debug(`← ${response.status} ${response.statusText}`);

    if (!response.ok && error) {
      console.error(`API Error (${response.status}): ${error}`);
    }

    return { data, error, status: response.status, ok: response.ok };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown network error";
    debug(`✗ ${method} ${url} — ${message}`);
    console.error(`Request failed: ${message}`);
    return { error: message, status: 0, ok: false };
  }
}

async function requestRaw(
  method: string,
  path: string,
  body?: BodyInit,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  let token: string;
  try {
    token = await getToken();
  } catch (err) {
    console.error(err instanceof Error ? err.message : "Authentication error.");
    process.exit(1);
  }

  debug(`→ ${method} ${url} (raw)`);
  const sdk = new LiquidLMClient({
    baseUrl,
    token,
    activeOrg: getEnvironmentToken()
      ? undefined
      : (getActiveOrgId() ?? undefined),
  });
  const res = await sdk.raw(method, path, { headers: extraHeaders, body });
  debug(`← ${res.status} ${res.statusText}`);
  return res;
}

export const apiClient = {
  get<T = unknown>(path: string): Promise<ApiResponse<T>> {
    return request<T>("GET", path);
  },
  post<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return request<T>("POST", path, body, options);
  },
  /** HTTP QUERY — safe/idempotent read with a JSON body (search endpoints). */
  query<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>("QUERY", path, body);
  },
  patch<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>("PATCH", path, body);
  },
  delete<T = unknown>(path: string): Promise<ApiResponse<T>> {
    return request<T>("DELETE", path);
  },
  put<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>("PUT", path, body);
  },
  /** Send a raw request (no JSON serialization). */
  raw: requestRaw,
};
