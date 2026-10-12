import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import {
  CLI_CALLBACK_HOST,
  CLI_CALLBACK_PORT,
  dispositionCliCallback,
  type CliCallbackTokens,
} from "./auth-callback.js";

export interface CliCallbackServerOptions {
  expectedState: string;
  port?: number;
  host?: string;
  timeoutMs?: number;
  renderFailurePage?: (success: boolean) => string;
  onSuccess: (tokens: CliCallbackTokens) => void;
  onMissingTokens?: () => void;
  onTimeout?: () => void;
}

export interface CliCallbackServerHandle {
  server: Server;
  port: number;
  close: () => Promise<void>;
}

export function createCliCallbackRequestHandler(
  options: CliCallbackServerOptions,
  resolvedPort: number,
): (req: IncomingMessage, res: ServerResponse) => void {
  const renderFailurePage =
    options.renderFailurePage ??
    (() => "<!DOCTYPE html><html><body>Login failed</body></html>");

  return (req, res) => {
    const host = options.host ?? CLI_CALLBACK_HOST;
    const url = new URL(req.url ?? "/", `http://${host}:${resolvedPort}`);
    const disposition = dispositionCliCallback(url, options.expectedState);

    if (disposition.kind === "not_found") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    if (disposition.kind === "bad_state") {
      res.writeHead(400, CALLBACK_RESPONSE_HEADERS);
      res.end(renderFailurePage(false));
      return;
    }

    if (disposition.kind === "missing_tokens") {
      res.writeHead(400, CALLBACK_RESPONSE_HEADERS);
      res.end(renderFailurePage(false));
      options.onMissingTokens?.();
      return;
    }

    res.writeHead(200, CALLBACK_RESPONSE_HEADERS);
    res.end(renderFailurePage(true));
    options.onSuccess(disposition.tokens);
  };
}

const CALLBACK_RESPONSE_HEADERS = {
  "Content-Type": "text/html",
  Connection: "close",
} as const;

/** Graceful drain window before forcing open connections closed. */
const CLOSE_FORCE_FALLBACK_MS = 500;

function closeServerSafely(server: Server): Promise<void> {
  return new Promise((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }

    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(forceCloseTimer);
      const code = (err as NodeJS.ErrnoException | undefined)?.code;
      if (err && code !== "ERR_SERVER_NOT_RUNNING") {
        console.warn(
          "[liquidlm] Callback server close:",
          err instanceof Error ? err.message : err,
        );
      }
      resolve();
    };

    const forceCloseTimer = setTimeout(() => {
      server.closeAllConnections?.();
    }, CLOSE_FORCE_FALLBACK_MS);

    server.close((err) => finish(err ?? undefined));
  });
}

export function startCliCallbackServer(
  options: CliCallbackServerOptions,
): Promise<CliCallbackServerHandle> {
  const host = options.host ?? CLI_CALLBACK_HOST;
  const requestedPort = options.port ?? CLI_CALLBACK_PORT;
  let startupSettled = false;
  let callbackHandled = false;
  let closePromise: Promise<void> | undefined;

  const guardedOptions: CliCallbackServerOptions = {
    ...options,
    onSuccess: (tokens) => {
      if (callbackHandled) return;
      callbackHandled = true;
      options.onSuccess(tokens);
    },
    onMissingTokens: () => {
      if (callbackHandled) return;
      callbackHandled = true;
      options.onMissingTokens?.();
    },
  };

  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const address = server.address();
      const boundPort =
        address && typeof address !== "string" ? address.port : requestedPort;
      return createCliCallbackRequestHandler(guardedOptions, boundPort)(
        req,
        res,
      );
    });

    const timeout = setTimeout(() => {
      if (startupSettled) return;
      startupSettled = true;
      clearTimeout(timeout);
      void closeServerSafely(server);
      options.onTimeout?.();
      reject(new Error("Login timed out."));
    }, options.timeoutMs ?? 120_000);

    server.on("error", (err) => {
      if (startupSettled) return;
      startupSettled = true;
      clearTimeout(timeout);
      reject(err);
    });

    server.listen(requestedPort, host, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to resolve callback server port."));
        return;
      }

      resolve({
        server,
        port: address.port,
        close: () => {
          if (!closePromise) {
            clearTimeout(timeout);
            closePromise = closeServerSafely(server);
          }
          return closePromise;
        },
      });
    });
  });
}
