import { randomBytes } from "node:crypto";

export const CLI_CALLBACK_HOST = "127.0.0.1";
export const CLI_CALLBACK_PORT = 9876;
export const CLI_CALLBACK_PATH = "/callback";

export function generateCallbackState(): string {
  return randomBytes(32).toString("hex");
}

export function buildCliCallbackUri(
  state: string,
  port: number = CLI_CALLBACK_PORT,
): string {
  const url = new URL(
    `http://${CLI_CALLBACK_HOST}:${port}${CLI_CALLBACK_PATH}`,
  );
  url.searchParams.set("state", state);
  return url.toString();
}

export function validateCallbackState(
  received: string | null | undefined,
  expected: string,
): boolean {
  return (
    typeof received === "string" && received.length > 0 && received === expected
  );
}

export interface CliCallbackTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export type CliCallbackDisposition =
  | { kind: "not_found" }
  | { kind: "bad_state" }
  | { kind: "missing_tokens" }
  | { kind: "success"; tokens: CliCallbackTokens };

export function dispositionCliCallback(
  url: URL,
  expectedState: string,
): CliCallbackDisposition {
  if (url.pathname !== CLI_CALLBACK_PATH) {
    return { kind: "not_found" };
  }

  if (!validateCallbackState(url.searchParams.get("state"), expectedState)) {
    return { kind: "bad_state" };
  }

  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token");
  const expiresIn = url.searchParams.get("expires_in");
  const tokenType = url.searchParams.get("token_type");

  if (!accessToken || !refreshToken) {
    return { kind: "missing_tokens" };
  }

  return {
    kind: "success",
    tokens: {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: tokenType ?? "bearer",
      expires_in: parseInt(expiresIn ?? "3600", 10),
    },
  };
}
