/** Contains metadata only: response bodies, credentials and URLs are not retained. */
export class LiquidLMError extends Error {
  readonly status: number;
  readonly requestId?: string;
  readonly code: string;
  constructor(
    message: string,
    options: { status?: number; requestId?: string; code?: string } = {},
  ) {
    super(message);
    this.name = "LiquidLMError";
    this.status = options.status ?? 0;
    this.requestId = options.requestId;
    this.code = options.code ?? "request_failed";
  }
}
