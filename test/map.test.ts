import { describe, expect, it } from 'vitest';
import { mapPool } from '../src/map.js';

describe('mapPool', () => {
  it('processes every item within the concurrency bound', async () => {
    let inflight = 0;
    let peak = 0;
    const out: number[] = [];
    for await (const r of mapPool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      inflight++;
      peak = Math.max(peak, inflight);
      await new Promise((res) => setTimeout(res, 1));
      inflight--;
      return n * 2;
    })) {
      out.push(r);
    }
    expect(out.sort((a, b) => a - b)).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(peak).toBeLessThanOrEqual(3);
  });

  it('handles an async source and empty input', async () => {
    async function* gen(): AsyncGenerator<string> {
      yield 'a';
      yield 'b';
    }
    const out: string[] = [];
    for await (const r of mapPool(gen(), 2, async (s) => s.toUpperCase())) out.push(r);
    expect(out.sort()).toEqual(['A', 'B']);

    const empty: number[] = [];
    for await (const r of mapPool<number, number>([], 2, async (n) => n)) empty.push(r);
    expect(empty).toEqual([]);
  });
});
