let enabled = false;

export function isDebug(): boolean {
  return enabled;
}

export function enableDebug(): void {
  enabled = true;
}

export function debug(...args: unknown[]): void {
  if (!enabled) return;
  const timestamp = new Date().toISOString().slice(11, 23);
  console.error(`\x1b[2m[${timestamp}]\x1b[0m`, ...args);
}
