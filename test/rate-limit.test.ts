import { afterEach, describe, expect, it, vi } from 'vitest';
import { RateLimiter } from '../src/rate-limit.js';

describe('RateLimiter', () => {
  afterEach(() => vi.useRealTimers());

  it('never waits when disabled (perMinute <= 0)', async () => {
    await expect(new RateLimiter(0).acquire()).resolves.toBeUndefined();
  });

  it('paces the second acquisition by the interval', async () => {
    vi.useFakeTimers();
    const rl = new RateLimiter(60); // 1/sec → 1000ms spacing
    await rl.acquire(); // first: immediate
    let resolved = false;
    const p = rl.acquire().then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(999);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    await p;
    expect(resolved).toBe(true);
  });
});
