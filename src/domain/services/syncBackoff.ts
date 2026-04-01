export function computeNextRetryIso(retryCount: number, now = new Date()): string {
  const baseDelayMs = 2_000;
  const maxDelayMs = 60_000;
  const jitterMs = Math.floor(Math.random() * 500);
  const delay = Math.min(baseDelayMs * 2 ** retryCount + jitterMs, maxDelayMs);
  return new Date(now.getTime() + delay).toISOString();
}
