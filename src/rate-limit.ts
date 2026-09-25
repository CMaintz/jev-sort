/**
 * Paces acquisitions to at most `perMinute`, spacing them evenly. Combined with the
 * per-request 429/529 backoff in the provider, this keeps big jobs under Jev's
 * ~1,200 req/min ceiling. `perMinute <= 0` disables it (no wait).
 */
export class RateLimiter {
  private readonly intervalMs: number;
  private nextAt = 0;

  constructor(perMinute: number) {
    this.intervalMs = perMinute > 0 ? 60_000 / perMinute : 0;
  }

  async acquire(): Promise<void> {
    if (this.intervalMs <= 0) return;
    const now = Date.now();
    const at = Math.max(now, this.nextAt);
    this.nextAt = at + this.intervalMs;
    const wait = at - now;
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  }
}
